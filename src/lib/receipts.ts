import "server-only";
import { addDays, addMonths, human, nextCharge, planLabel } from "./agenda";
import { getCompany } from "./company";
import { type EmailResult, sendEmail } from "./email";
import { getPlans } from "./plans";
import { receiptPdf } from "./pdf/documents";
import { sendPush } from "./push";
import { SITE_URL } from "./site";
import { db } from "./supabase";
import { FOUNDER_PHONE, PLAN_TEST_PRODUCTS, type PlanTestProduct } from "./test-kit";
import type { Business, Payment } from "./types";

// Payment receipts: one per registered payment, issued automatically, never edited.
// A mistake is fixed by voiding the payment (the receipt stays, marked void, with the
// reason) and registering it again. Everything that touches money goes to the audit log.

export const METHOD_LABEL: Record<Payment["method"], string> = {
  paypal: "PayPal",
  card: "Tarjeta",
  ach: "Transferencia bancaria",
  yappy: "Yappy",
  cash: "Efectivo",
  other: "Otro",
};
export const KIND_LABEL: Record<Payment["kind"], string> = {
  setup: "Instalación",
  monthly: "Mensualidad",
  annual: "Plan anual",
  pieces: "Piezas",
  other: "Otro",
};
export const methodName = (p: Pick<Payment, "method" | "method_label">) => (p.method === "other" ? p.method_label || "Otro" : METHOD_LABEL[p.method]);

export type Receipt = {
  id: string;
  number: string;
  token: string;
  payment_id: string | null;
  business_id: string | null;
  venue_name: string;
  owner_name: string | null;
  owner_email: string | null;
  plan_label: string;
  plaques: number;
  concept: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  paid_on: string;
  period_start: string | null;
  period_end: string | null;
  service_start: string | null;
  next_due: string | null;
  status: "paid" | "void";
  void_reason: string | null;
  voided_at: string | null;
  issued_at: string;
  /** What was bought, line by line (one-time pieces); empty for a monthly payment. */
  items: ReceiptItem[];
};

export type ReceiptItem = { name: string; qty: number; unit: number; total: number };

export type ReceiptSend = { id: string; receipt_id: string; channel: "email" | "push" | "whatsapp"; recipient: string | null; status: "sent" | "failed" | "skipped" | "opened"; detail: string | null; created_at: string };

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const PANAMA = 5 * 3600_000;
// A plain date ("2026-11-11") is already the local day; a timestamp is moved to Panamá time.
const localDay = (iso: string) => (iso.length === 10 ? iso : new Date(Date.parse(iso) - PANAMA).toISOString().slice(0, 10));
export const receiptMoney = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const receiptUrl = (r: Pick<Receipt, "token">) => `${SITE_URL}/recibo/${r.token}`;

/** Something the founder did with money. Never throws: the action itself already happened. */
export async function audit(action: string, o: { businessId?: string | null; entity?: string; entityId?: string; details?: Record<string, unknown> } = {}) {
  const { error } = await db().from("audit_log").insert({ action, business_id: o.businessId ?? null, entity: o.entity ?? null, entity_id: o.entityId ?? null, details: o.details ?? {} });
  if (error) console.error("[audit]", error.message);
}

/**
 * The receipt of a registered payment, created the first time and returned as is after
 * that (one per payment, enforced by the database), with a snapshot of plan and dates.
 */
export async function issueReceipt(paymentId: string): Promise<Receipt> {
  const existing = must(await db().from("receipts").select("*").eq("payment_id", paymentId).maybeSingle()) as Receipt | null;
  if (existing) return existing;
  const pay = must(await db().from("payments").select("*").eq("id", paymentId).maybeSingle()) as Payment | null;
  if (!pay) throw new Error("El pago no existe.");
  const [b, pays, tagCount, plans] = await Promise.all([
    db().from("businesses").select("*").eq("id", pay.business_id).single().then((r) => must(r) as Business),
    db().from("payments").select("kind, method, paid_at, amount").eq("business_id", pay.business_id).then((r) => must(r) as Pick<Payment, "kind" | "method" | "paid_at" | "amount">[]),
    db().from("tags").select("id", { count: "exact", head: true }).eq("business_id", pay.business_id).eq("active", true),
    getPlans(),
  ]);
  const plaques = tagCount.count ?? 0;
  const after = nextCharge(b, pays);
  const recurring = pay.kind === "monthly" || pay.kind === "annual";
  // A Plan Test purchase: the receipt lists the product, the quantity and the unit price.
  const order = (await db().from("orders").select("product, quantity, unit_price, total, customer_name").eq("payment_id", pay.id).maybeSingle()).data as
    | { product: PlanTestProduct; quantity: number; unit_price: number; total: number; customer_name: string | null }
    | null;
  const items: ReceiptItem[] = order
    ? [{ name: PLAN_TEST_PRODUCTS[order.product].name, qty: order.quantity, unit: Number(order.unit_price), total: Number(order.total) }]
    : [];
  const months = after?.kind === "annual" ? 12 : 1;
  const row = {
    payment_id: pay.id,
    business_id: b.id,
    venue_name: b.name,
    owner_name: order?.customer_name || b.billing_name || b.manager_name,
    owner_email: b.billing_email || b.manager_email,
    plan_label: order ? "Plan Test · compra individual" : planLabel(b, after, 0, plans),
    plaques: order ? order.quantity : plaques,
    concept: order ? PLAN_TEST_PRODUCTS[order.product].short : KIND_LABEL[pay.kind],
    items,
    amount: Number(pay.amount),
    currency: "USD",
    method: methodName(pay),
    reference: pay.reference,
    paid_on: localDay(pay.paid_at),
    period_start: recurring && after ? addMonths(after.due, -months) : null,
    period_end: recurring && after ? addDays(after.due, -1) : null,
    service_start: localDay(b.created_at),
    // A one-time purchase has no next due date.
    next_due: order ? null : after?.due ?? null,
  };
  const ins = await db().from("receipts").insert(row).select("*").single();
  if (ins.error) {
    // Two requests at once: the other one won, use its receipt.
    const again = must(await db().from("receipts").select("*").eq("payment_id", paymentId).maybeSingle()) as Receipt | null;
    if (again) return again;
    throw new Error(ins.error.message);
  }
  const r = ins.data as Receipt;
  await audit("receipt.issued", { businessId: b.id, entity: "receipt", entityId: r.number, details: { amount: r.amount, method: r.method, payment_id: pay.id } });
  return r;
}

function emailBody(r: Receipt) {
  const hi = r.owner_name ? `Hola, ${r.owner_name.split(" ")[0]}.` : "Hola.";
  const rows: [string, string][] = [
    ["Negocio", r.venue_name],
    ["Plan contratado", r.plan_label],
    ...(r.items?.length
      ? r.items.map((it) => [it.name, `${it.qty} × ${receiptMoney(it.unit)} = ${receiptMoney(it.total)}`] as [string, string])
      : ([["Placas NFC", String(r.plaques)]] as [string, string][])),
    ["Monto pagado", `${receiptMoney(r.amount)} ${r.currency}`],
    ["Método de pago", r.method],
    ["Fecha de pago", human(r.paid_on)],
    ...(r.next_due ? ([["Próximo vencimiento", human(r.next_due)]] as [string, string][]) : []),
    ["Recibo", r.number],
  ];
  const url = receiptUrl(r);
  const what = r.items?.length ? "tu compra" : "tu suscripción";
  const text = `${hi}\n\nTe confirmamos que hemos recibido correctamente tu pago correspondiente a ${what} de FiveTap.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nTu recibo: ${url}\n\n¿Dudas? WhatsApp FiveTap ${FOUNDER_PHONE}.\nGracias por confiar en FiveTap.`;
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#26251f">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-weight:700;font-size:18px;color:#0a0a0a;margin:0 0 24px">FiveTap</p>
<div style="background:#fff;border:1px solid #e6e4de;border-radius:16px;padding:28px">
<p style="display:inline-block;margin:0 0 14px;padding:3px 10px;border-radius:99px;background:#e8f4ec;color:#157f45;font-size:12px;font-weight:700">PAGADO</p>
<p style="font-size:16px;margin:0 0 8px">${esc(hi)}</p>
<p style="margin:0 0 20px;line-height:1.5">Te confirmamos que hemos recibido correctamente tu pago correspondiente a ${what} de FiveTap. Estos son los detalles de tu transacción:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:8px 0;border-top:1px solid #eeece6;color:#6b6a64">${esc(k)}</td><td style="padding:8px 0;border-top:1px solid #eeece6;text-align:right;font-weight:600;color:#0a0a0a">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:99px;font-weight:600">Ver mi recibo</a></p>
<p style="margin:20px 0 0;line-height:1.5">¿Dudas? Escríbenos por WhatsApp al ${FOUNDER_PHONE}. Gracias por confiar en FiveTap.</p>
</div>
<p style="font-size:12px;color:#6b6a64;margin:16px 4px 0;line-height:1.5">Adjuntamos tu recibo en PDF. Es un recibo de pago y no sustituye una factura fiscal.</p>
</div></body></html>`;
  return { text, html };
}

export async function logSend(receiptId: string, channel: "email" | "push" | "whatsapp", recipient: string | null, result: { status: string; detail: string }) {
  await db().from("receipt_sends").insert({ receipt_id: receiptId, channel, recipient, status: result.status, detail: result.detail.slice(0, 300) });
}

/** The receipt's PDF, with the provider's names as saved in Empresa. */
export async function receiptPdfFor(r: Receipt) {
  const c = await getCompany();
  return receiptPdf(r, { tradeName: c.trade_name || "FiveTap", legalName: c.legal_name, site: SITE_URL.replace(/^https?:\/\//, ""), whatsapp: FOUNDER_PHONE });
}

/**
 * Sends the receipt to the owner by email (with the PDF) and as a notification in
 * FiveTap Business. Each attempt is logged; a failed one can be retried from the panel,
 * the receipt itself is never duplicated.
 */
export async function deliverReceipt(r: Receipt, opts: { email: boolean; push: boolean; ownerToken?: string; reactivated?: boolean }) {
  const out: { email?: EmailResult; push?: EmailResult } = {};
  if (r.status !== "paid") throw new Error("Un comprobante anulado no se envía.");
  if (opts.email) {
    if (!r.owner_email) out.email = { status: "skipped", detail: "El negocio no tiene correo registrado." };
    else {
      const { text, html } = emailBody(r);
      const pdf = await receiptPdfFor(r);
      out.email = await sendEmail({
        to: r.owner_email,
        subject: "Pago confirmado — FiveTap",
        text,
        html,
        attachments: [{ filename: `Comprobante-${r.number}.pdf`, content: pdf }],
        // A double tap within the same minute sends one email, not two.
        idempotencyKey: `receipt-${r.id}-${Math.floor(Date.now() / 60_000)}`,
      });
    }
    await logSend(r.id, "email", r.owner_email, out.email);
  }
  if (opts.push && r.business_id) {
    const n = await sendPush(
      { role: "owner", businessId: r.business_id },
      {
        title: `💳 Pago confirmado · ${r.venue_name}`,
        body: `Recibimos ${receiptMoney(r.amount)} (${r.plan_label}).${r.next_due ? ` Próximo vencimiento: ${human(r.next_due)}.` : ""}${opts.reactivated ? " Tus placas ya funcionan otra vez." : ""} Toca para ver tu comprobante.`,
        url: opts.ownerToken ? `/mi/${opts.ownerToken}/pagos` : `/recibo/${r.token}`,
        tag: `receipt-${r.id}`,
      },
    ).catch(() => 0);
    out.push = n ? { status: "sent", detail: `${n} ${n === 1 ? "celular" : "celulares"}` } : { status: "skipped", detail: "Ningún celular del dueño tiene los avisos activos." };
    await logSend(r.id, "push", "FiveTap Business", out.push);
  }
  await audit("receipt.sent", { businessId: r.business_id, entity: "receipt", entityId: r.number, details: { email: out.email?.status, push: out.push?.status } });
  return out;
}

export async function receiptsForBusiness(businessId: string) {
  return must(await db().from("receipts").select("*").eq("business_id", businessId).order("issued_at", { ascending: false })) as Receipt[];
}

export async function receiptByToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  return must(await db().from("receipts").select("*").eq("token", token).maybeSingle()) as Receipt | null;
}

export async function listReceipts(limit = 300) {
  const receipts = must(await db().from("receipts").select("*").order("issued_at", { ascending: false }).limit(limit)) as Receipt[];
  const sends = receipts.length
    ? (must(await db().from("receipt_sends").select("*").in("receipt_id", receipts.map((r) => r.id)).order("created_at", { ascending: false })) as ReceiptSend[])
    : [];
  return receipts.map((r) => ({ receipt: r, sends: sends.filter((s) => s.receipt_id === r.id) }));
}

export type AuditRow = { id: string; at: string; action: string; business_id: string | null; entity: string | null; entity_id: string | null; details: Record<string, unknown> };
export async function recentAudit(limit = 60) {
  return must(await db().from("audit_log").select("*").order("at", { ascending: false }).limit(limit)) as AuditRow[];
}

export async function customMethods() {
  return must(await db().from("payment_methods").select("id, label").order("label")) as { id: string; label: string }[];
}
