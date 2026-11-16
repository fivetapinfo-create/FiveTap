import "server-only";
import { todayPanama } from "./agenda";
import { billingOf } from "./data";
import { sendPush } from "./push";
import { audit, issueReceipt, type Receipt } from "./receipts";
import { db } from "./supabase";

// Renewals the owner reports from FiveTap Business ("ya pagué"). A report is never a payment:
// it waits as "pending" until the founder checks the money arrived and confirms it. Only then
// the payment is registered, the receipt is issued and the subscription moves forward.

export type ClaimMethod = "cash" | "yappy" | "ach" | "paypal" | "other";
export type ClaimStatus = "pending" | "confirmed" | "rejected";
export type Claim = {
  id: string; business_id: string; amount: number; method: ClaimMethod; reference: string | null; due_on: string | null;
  status: ClaimStatus; reason: string | null; payment_id: string | null; created_at: string; decided_at: string | null;
};

export const CLAIM_METHOD: Record<ClaimMethod, string> = { cash: "Efectivo", yappy: "Yappy", ach: "Transferencia", paypal: "PayPal", other: "Otro" };
export const CLAIM_STATUS: Record<ClaimStatus, string> = { pending: "En verificación", confirmed: "Confirmado", rejected: "No confirmado" };

/** The owner says they paid. One open report per business at a time; the founder is notified. */
export async function reportPayment(b: { id: string; name: string }, input: { method: string; amount: number; reference?: string | null; due_on?: string | null }) {
  const method = (Object.keys(CLAIM_METHOD) as ClaimMethod[]).find((m) => m === input.method);
  if (!method) throw new Error("Elige cómo pagaste.");
  if (!(input.amount > 0)) throw new Error("No hay un monto por pagar.");
  const open = await db().from("payment_claims").select("id").eq("business_id", b.id).eq("status", "pending").limit(1);
  if (open.data?.length) throw new Error("Ya nos avisaste de un pago. Lo estamos verificando.");
  const reference = input.reference?.trim().slice(0, 120) || null;
  const { data, error } = await db().from("payment_claims").insert({ business_id: b.id, amount: Math.round(input.amount * 100) / 100, method, reference, due_on: input.due_on ?? null }).select("id").single();
  if (error) throw new Error(error.message);
  await audit("payment.reported", { businessId: b.id, entity: "payment_claim", entityId: data.id, details: { amount: input.amount, method, reference } });
  await sendPush({ role: "founder" }, { title: `💵 Pago por confirmar · ${b.name}`, body: `$${input.amount} por ${CLAIM_METHOD[method]}${reference ? ` · ref. ${reference}` : ""}. Revisa que llegó y confírmalo.`, url: "/admin/cobros#por-confirmar" }).catch(() => 0);
  return data.id as string;
}

export async function claimsFor(businessId: string, limit = 10) {
  const { data } = await db().from("payment_claims").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Claim[];
}

export async function pendingClaims() {
  const { data } = await db().from("payment_claims").select("*, business:businesses(id, name, owner_token)").eq("status", "pending").order("created_at");
  return (data ?? []) as (Claim & { business: { id: string; name: string; owner_token: string } | null })[];
}

export async function pendingClaimsCount() {
  const { count } = await db().from("payment_claims").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

/**
 * The founder confirms the money arrived: the payment is registered (monthly or annual, as the
 * charge was), the receipt is issued, a paused venue comes back and the owner is told.
 */
export async function confirmClaim(claimId: string, kind: "monthly" | "annual" = "monthly"): Promise<Receipt> {
  const { data: c } = await db().from("payment_claims").select("*").eq("id", claimId).maybeSingle();
  if (!c) throw new Error("Aviso de pago no encontrado.");
  const claim = c as Claim;
  if (claim.status !== "pending") throw new Error("Este aviso ya fue revisado.");
  const { data: b } = await db().from("businesses").select("*").eq("id", claim.business_id).maybeSingle();
  if (!b) throw new Error("Negocio no encontrado.");
  const wasPaused = (await billingOf(b)).kind === "suspended";
  // Claimed first, so two taps on Confirm can never register the payment twice.
  const lock = await db().from("payment_claims").update({ status: "confirmed", decided_at: new Date().toISOString() }).eq("id", claim.id).eq("status", "pending").select("id");
  if (!lock.data?.length) throw new Error("Este aviso ya fue revisado.");
  const ins = await db().from("payments").insert({
    business_id: b.id, business_name: b.name, amount: claim.amount, kind, method: claim.method,
    method_label: null, reference: claim.reference, paid_at: todayPanama(), idempotency_key: `claim-${claim.id}`,
  }).select("id").single();
  if (ins.error) {
    await db().from("payment_claims").update({ status: "pending", decided_at: null }).eq("id", claim.id);
    throw new Error(ins.error.message);
  }
  await db().from("payment_claims").update({ payment_id: ins.data.id }).eq("id", claim.id);
  await db().from("businesses").update({ status: "active" }).eq("id", b.id).eq("status", "trial");
  await db().from("businesses").update({ grace_until: null }).eq("id", b.id);
  await audit("payment.recorded", { businessId: b.id, entity: "payment", entityId: ins.data.id, details: { amount: claim.amount, kind, method: claim.method, reference: claim.reference, from_claim: claim.id } });
  const receipt = await issueReceipt(ins.data.id);
  const reactivated = wasPaused && !(await billingOf({ ...b, grace_until: null })).blocked;
  await sendPush({ role: "owner", businessId: b.id }, {
    title: reactivated ? `¡Listo, ${b.name}! Tus placas ya funcionan` : `Pago confirmado · ${b.name}`,
    body: `Confirmamos tu pago de $${claim.amount}. Tu recibo ${receipt.number} está listo para guardar.`,
    url: `/mi/${b.owner_token}/renovar?recibo=${encodeURIComponent(receipt.number)}`,
  }).catch(() => 0);
  return receipt;
}

/** The money did not arrive (or the details do not match): the owner sees why and can report again. */
export async function rejectClaim(claimId: string, reason: string) {
  const why = reason.trim().slice(0, 300);
  if (why.length < 3) throw new Error("Escribe el motivo para que el cliente sepa qué revisar.");
  const { data } = await db().from("payment_claims").update({ status: "rejected", reason: why, decided_at: new Date().toISOString() }).eq("id", claimId).eq("status", "pending").select("business_id").maybeSingle();
  if (!data) throw new Error("Este aviso ya fue revisado.");
  const { data: b } = await db().from("businesses").select("name, owner_token").eq("id", data.business_id).maybeSingle();
  await audit("payment.claim_rejected", { businessId: data.business_id, entity: "payment_claim", entityId: claimId, details: { reason: why } });
  if (b) await sendPush({ role: "owner", businessId: data.business_id }, { title: `No pudimos confirmar tu pago · ${b.name}`, body: why, url: `/mi/${b.owner_token}/renovar` }).catch(() => 0);
}
