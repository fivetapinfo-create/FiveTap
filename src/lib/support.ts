import "server-only";
import { sendPush } from "./push";
import { db } from "./supabase";

// Support requests: the owner or manager writes from FiveTap Business, the founder answers
// from the panel. Each request belongs to one business; nothing crosses between them.

export type TicketStatus = "open" | "answered" | "resolved";
export type TicketCategory = "question" | "plaque" | "page" | "billing" | "other";
export type Author = "owner" | "manager" | "founder";
export type Ticket = { id: string; number: number; business_id: string; subject: string; category: TicketCategory; status: TicketStatus; opened_by: Author; created_at: string; updated_at: string };
export type TicketMessage = { id: string; ticket_id: string; author: Author; body: string; created_at: string };

export const CATEGORY: Record<TicketCategory, string> = { question: "Pregunta", plaque: "Una placa no funciona", page: "Cambio en mi página", billing: "Pagos o plan", other: "Otro" };
export const T_STATUS: Record<TicketStatus, string> = { open: "Esperando respuesta", answered: "Respondida", resolved: "Resuelta" };
export const AUTHOR: Record<Author, string> = { owner: "Dueño/a", manager: "Gerente", founder: "FiveTap" };

const clean = (v: string, max: number) => v.replace(/\r/g, "").trim().slice(0, max);

/** The business opens a request; the founder gets a notice. */
export async function openTicket(b: { id: string; name: string }, by: "owner" | "manager", subject: string, category: string, body: string) {
  const s = clean(subject, 120), m = clean(body, 2000);
  if (s.length < 3) throw new Error("Escribe de qué se trata (al menos 3 letras).");
  if (m.length < 3) throw new Error("Cuéntanos qué pasa.");
  const cat = (Object.keys(CATEGORY) as TicketCategory[]).find((c) => c === category) ?? "question";
  const { data, error } = await db().from("support_tickets").insert({ business_id: b.id, subject: s, category: cat, opened_by: by }).select("id, number").single();
  if (error) throw new Error(error.message);
  const msg = await db().from("support_messages").insert({ ticket_id: data.id, author: by, body: m });
  if (msg.error) throw new Error(msg.error.message);
  await sendPush({ role: "founder" }, { title: `Soporte #${data.number} · ${b.name}`, body: `${CATEGORY[cat]}: ${s}`, url: `/admin/soporte/${data.id}` }).catch(() => 0);
  return data as { id: string; number: number };
}

/** A new message in a request. From the business it reopens it; from the founder it marks it answered. */
export async function replyTicket(ticketId: string, author: Author, body: string, scope: { businessId?: string } = {}) {
  const m = clean(body, 2000);
  if (m.length < 1) throw new Error("Escribe tu mensaje.");
  let q = db().from("support_tickets").select("id, number, business_id, subject, status").eq("id", ticketId);
  if (scope.businessId) q = q.eq("business_id", scope.businessId);
  const { data: t } = await q.maybeSingle();
  if (!t) throw new Error("Solicitud no encontrada.");
  const ins = await db().from("support_messages").insert({ ticket_id: t.id, author, body: m });
  if (ins.error) throw new Error(ins.error.message);
  const status: TicketStatus = author === "founder" ? "answered" : "open";
  await db().from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", t.id);
  if (author === "founder") {
    const { data: b } = await db().from("businesses").select("owner_token").eq("id", t.business_id).maybeSingle();
    await sendPush({ role: ["owner", "manager"], businessId: t.business_id }, { title: `FiveTap respondió tu solicitud #${t.number}`, body: m.slice(0, 120), url: b?.owner_token ? `/mi/${b.owner_token}/soporte?t=${t.id}` : "/" }).catch(() => 0);
  } else {
    const { data: b } = await db().from("businesses").select("name").eq("id", t.business_id).maybeSingle();
    await sendPush({ role: "founder" }, { title: `Soporte #${t.number} · ${b?.name ?? ""}`, body: m.slice(0, 120), url: `/admin/soporte/${t.id}` }).catch(() => 0);
  }
}

export async function setTicketStatus(ticketId: string, status: TicketStatus, scope: { businessId?: string } = {}) {
  let q = db().from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
  if (scope.businessId) q = q.eq("business_id", scope.businessId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function ticketsFor(businessId: string) {
  const { data } = await db().from("support_tickets").select("*").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(100);
  return (data ?? []) as Ticket[];
}

export async function allTickets(status?: TicketStatus) {
  let q = db().from("support_tickets").select("*, business:businesses(id, name)").order("updated_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as (Ticket & { business: { id: string; name: string } | null })[];
}

export async function ticketThread(ticketId: string, scope: { businessId?: string } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return null;
  let q = db().from("support_tickets").select("*, business:businesses(id, name, owner_token)").eq("id", ticketId);
  if (scope.businessId) q = q.eq("business_id", scope.businessId);
  const { data: t } = await q.maybeSingle();
  if (!t) return null;
  const { data: msgs } = await db().from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at");
  return { ticket: t as Ticket & { business: { id: string; name: string; owner_token: string } | null }, messages: (msgs ?? []) as TicketMessage[] };
}

export async function openTicketsCount() {
  const { count } = await db().from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}

/** Requests of one business that FiveTap answered and the business has not closed or replied to. */
export async function answeredTicketsCount(businessId: string) {
  const { count } = await db().from("support_tickets").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "answered");
  return count ?? 0;
}
