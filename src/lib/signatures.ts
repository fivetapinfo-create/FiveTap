import "server-only";
import { createHash } from "node:crypto";
import { agreementClauses, type Agreement } from "./agreement";
import { db } from "./supabase";

// Electronic signature of FiveTap contracts (Ley 51 de 2008, Panamá: a simple electronic
// signature, i.e. data the signer adopts to identify themself and accept the document). Each
// signature keeps evidence of how it was made: the document's fingerprint (SHA-256) at the
// moment of signing, the signer's name and drawn signature, date and time, IP and device.
// If the contract changes afterwards, the fingerprint no longer matches and it must be signed
// again. This is not a "qualified" electronic signature (certificate from a registered
// provider), which the law requires only where a signature must be notarized or sworn.

export type Signature = {
  id: string; agreement_id: string; party: "client" | "fivetap"; signer_name: string; signer_role: string | null;
  signature_png: string | null; doc_hash: string; ip: string | null; user_agent: string | null; signed_at: string;
};

/** The contract's fingerprint: same terms, same hash. Any change to the terms changes it. */
export function docHash(a: Agreement) {
  const terms = {
    number: a.number, venue_name: a.venue_name, venue_address: a.venue_address, signer_name: a.signer_name, signer_role: a.signer_role,
    plan_name: a.plan_name, monthly_fee: Number(a.monthly_fee), plaques: a.plaques, cards: a.cards, lanyards: a.lanyards,
    start_date: a.start_date, end_date: a.end_date, payment_method: a.payment_method, clauses: agreementClauses(a),
  };
  return createHash("sha256").update(JSON.stringify(terms)).digest("hex");
}

export async function signaturesFor(agreementId: string) {
  const { data } = await db().from("agreement_signatures").select("*").eq("agreement_id", agreementId).order("signed_at");
  return (data ?? []) as Signature[];
}

export type SignStatus = "draft" | "sent" | "client" | "both" | "changed";
export const SIGN_LABEL: Record<SignStatus, string> = { draft: "Sin enviar", sent: "Enviado, por firmar", client: "Firmado por el cliente", both: "Firmado por ambas partes", changed: "Cambió después de firmar" };

/** Where the signing stands, checking each signature against the contract as it is now. */
export function signStatus(a: Agreement & { sent_at?: string | null }, sigs: Signature[]): SignStatus {
  const hash = docHash(a);
  if (sigs.length && sigs.some((s) => s.doc_hash !== hash)) {
    if (!sigs.some((s) => s.doc_hash === hash)) return "changed";
  }
  const valid = sigs.filter((s) => s.doc_hash === hash);
  const client = valid.some((s) => s.party === "client");
  const fivetap = valid.some((s) => s.party === "fivetap");
  if (client && fivetap) return "both";
  if (client) return "client";
  return a.sent_at ? "sent" : "draft";
}

const PNG_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/** Saves one party's signature with its evidence. One valid signature per party and version. */
export async function sign(a: Agreement, party: "client" | "fivetap", input: { name: string; role?: string | null; png?: string | null; ip?: string | null; ua?: string | null }) {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (name.length < 3) throw new Error("Escribe el nombre completo de quien firma.");
  if (party === "client") {
    if (!input.png || !PNG_RE.test(input.png) || input.png.length < 1500) throw new Error("Dibuja tu firma en el recuadro.");
    if (input.png.length > 200000) throw new Error("La firma es demasiado grande. Bórrala y dibújala otra vez.");
  }
  const hash = docHash(a);
  const prior = await signaturesFor(a.id);
  if (prior.some((s) => s.party === party && s.doc_hash === hash)) throw new Error("Este contrato ya está firmado por esta parte.");
  const { error } = await db().from("agreement_signatures").insert({
    agreement_id: a.id, party, signer_name: name, signer_role: input.role?.slice(0, 80) || null, signature_png: input.png ?? null,
    doc_hash: hash, ip: input.ip?.slice(0, 64) ?? null, user_agent: input.ua?.slice(0, 400) ?? null,
  });
  if (error) throw new Error(error.message);
  return hash;
}

/** For the founder's home: how many contracts and how many still waiting for the client's signature. */
export async function contractCounts() {
  const [{ data: list }, { data: sigs }] = await Promise.all([
    db().from("agreements").select("*"),
    db().from("agreement_signatures").select("agreement_id, party, doc_hash"),
  ]);
  const all = (list ?? []) as (Agreement & { sent_at: string | null })[];
  const pending = all.filter((a) => {
    const hash = docHash(a);
    return !((sigs ?? []) as { agreement_id: string; party: string; doc_hash: string }[]).some((s) => s.agreement_id === a.id && s.party === "client" && s.doc_hash === hash);
  }).length;
  return { total: all.length, pending };
}
