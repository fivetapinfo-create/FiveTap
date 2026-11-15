"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole, renewCode, unlock } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { db } from "@/lib/supabase";
import { saveStaff } from "@/lib/team";
import { deleteItem, deletePromotion, saveItem, savePromotion, setActive } from "@/lib/experience";
import { adjustLine, setOrderStatus, type OrderStatus } from "@/lib/orders";
import { addManualReservation, saveReservationSettings, setReservationStatus, type ReservationStatus } from "@/lib/reservations";
import { phoneDigits } from "@/lib/reservation-rules";
import { openTicket, replyTicket, setTicketStatus } from "@/lib/support";

/** The owner or manager closes a private message once it is handled (or opens it again). */
export async function setMessageResolved(f: FormData) {
  const token = String(f.get("token") ?? "");
  const id = String(f.get("feedback_id") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !/^[0-9a-f-]{36}$/i.test(id) || !(await accessRole(b))) return;
  const now = new Date().toISOString();
  const resolved = f.get("resolved") === "1";
  const { error } = await db()
    .from("feedback")
    .update(resolved ? { resolved_at: now, read_at: now } : { resolved_at: null })
    .eq("id", id)
    .eq("business_id", b.id);
  if (error) console.error("[setMessageResolved]", error.message);
  revalidatePath(`/mi/${token}`);
}

/** Checks the access code and remembers it on this phone (as owner or manager). */
export async function unlockAccess(f: FormData) {
  const token = String(f.get("token") ?? "");
  const code = String(f.get("code") ?? "").replace(/\D/g, "");
  const b = await businessByOwnerToken(token);
  if (!b) redirect("/");
  const r = await unlock(b, code);
  if (r.ok) redirect(`/mi/${token}?rol=${r.role === "manager" ? "gerente" : "dueno"}${f.get("instalar") === "1" ? "&instalar=1" : ""}`);
  await new Promise((res) => setTimeout(res, 1000));
  redirect(`/mi/${token}?acceso=${r.locked ? "bloqueado" : "mal"}${f.get("instalar") === "1" ? "&instalar=1" : ""}`);
}

/** The owner gives the manager a new code (e.g. the manager left). Only the owner can. */
export async function renewManagerCode(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || (await accessRole(b)) !== "owner") redirect("/");
  await renewCode(b, "manager");
  redirect(`/mi/${token}/ajustes?ok=codigo#acceso`);
}

/** Owner or manager: writes who carries each waiter card (e.g. a new waiter took a card). */
export async function setStaffName(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !(await accessRole(b))) redirect("/");
  try {
    await saveStaff({ tagId: String(f.get("tag_id") ?? ""), businessId: b.id, name: String(f.get("staff_name") ?? ""), newPerson: f.get("new_person") === "1" });
  } catch (e) {
    console.error("[setStaffName]", e instanceof Error ? e.message : e);
  }
  revalidatePath(`/mi/${token}`);
  redirect(`/mi/${token}#equipo`);
}

// ---------- Mi página NFC: promotions and catalog, edited by the owner or the manager ----------

async function pageRun(f: FormData, ok: string, anchor: string, run: (businessId: string) => Promise<unknown>) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !(await accessRole(b))) redirect("/");
  const back = `/mi/${token}/pagina`;
  let error = "";
  try {
    await run(b.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo guardar.";
  }
  revalidatePath(back);
  redirect(error ? `${back}?error=${encodeURIComponent(error)}#${anchor}` : `${back}?ok=${ok}#${anchor}`);
}
const fid = (f: FormData) => String(f.get("id") ?? "");

export async function savePromoOwner(f: FormData) { await pageRun(f, "promo", "promos", (id) => savePromotion(id, f)); }
export async function deletePromoOwner(f: FormData) { await pageRun(f, "promo-borrada", "promos", (id) => deletePromotion(id, fid(f))); }
export async function togglePromoOwner(f: FormData) { await pageRun(f, "guardado", "promos", (id) => setActive(id, "promotions", fid(f), f.get("active") === "1")); }
export async function saveItemOwner(f: FormData) { await pageRun(f, "item", "catalogo", (id) => saveItem(id, f)); }
export async function deleteItemOwner(f: FormData) { await pageRun(f, "item-borrado", "catalogo", (id) => deleteItem(id, fid(f))); }
export async function toggleItemOwner(f: FormData) { await pageRun(f, "guardado", "catalogo", (id) => setActive(id, "catalog_items", fid(f), f.get("active") === "1")); }

// ---------- Pedidos: the owner or the manager moves orders forward ----------

async function orderRun(f: FormData, run: (businessId: string) => Promise<unknown>) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !(await accessRole(b))) redirect("/");
  const back = `/mi/${token}/pedidos`;
  let error = "";
  try {
    await run(b.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo guardar.";
  }
  revalidatePath(back);
  redirect(error ? `${back}?error=${encodeURIComponent(error)}` : `${back}#p-${String(f.get("order_id") ?? "")}`);
}
const STATUSES: OrderStatus[] = ["preparing", "ready", "delivered", "canceled"];

export async function moveOrder(f: FormData) {
  const to = STATUSES.find((s) => s === String(f.get("to") ?? ""));
  await orderRun(f, (id) => {
    if (!to) throw new Error("Estado no válido.");
    return setOrderStatus(id, String(f.get("order_id") ?? ""), to, String(f.get("reason") ?? "").trim().slice(0, 200) || null);
  });
}
export async function adjustOrderLine(f: FormData) {
  await orderRun(f, (id) => adjustLine(id, String(f.get("order_id") ?? ""), String(f.get("line_id") ?? ""), Number(f.get("qty") ?? 0)));
}

// ---------- Reservas: confirm, cancel or close them; confirmations go out by WhatsApp ----------

const R_TO: ReservationStatus[] = ["confirmed", "canceled", "attended", "no_show", "pending"];

async function resvAuth(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !(await accessRole(b))) redirect("/");
  return { b, token, back: `/mi/${token}/reservas${String(f.get("back") ?? "").startsWith("?") ? String(f.get("back")) : ""}` };
}

/** Changes a reservation. Confirming or cancelling opens WhatsApp with the message ready (no API, nothing simulated). */
export async function moveReservation(f: FormData) {
  const { b, token, back } = await resvAuth(f);
  const to = R_TO.find((x) => x === String(f.get("to") ?? ""));
  const id = String(f.get("id") ?? "");
  let target = back;
  try {
    if (!to) throw new Error("Estado no válido.");
    const reason = String(f.get("reason") ?? "").trim().slice(0, 200) || null;
    await setReservationStatus(b.id, id, to, reason);
    if ((to === "confirmed" || to === "canceled") && f.get("notify") === "1") {
      const { data: r } = await db().from("reservations").select("customer_name, phone, party_size, reserved_on, reserved_at").eq("id", id).eq("business_id", b.id).maybeSingle();
      const wa = phoneDigits(r?.phone);
      if (r && wa) {
        const day = new Date(`${r.reserved_on}T12:00:00Z`).toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
        const first = String(r.customer_name).split(" ")[0];
        const hh = Number(String(r.reserved_at).slice(0, 2));
        const at = `${hh % 12 || 12}:${String(r.reserved_at).slice(3)} ${hh >= 12 ? "p. m." : "a. m."}`;
        const text = to === "confirmed"
          ? `Hola ${first}, te escribimos de ${b.name}. ✅ Tu reserva está confirmada: ${day} a las ${at}, para ${r.party_size} ${r.party_size === 1 ? "persona" : "personas"}. ¡Te esperamos!`
          : `Hola ${first}, te escribimos de ${b.name}. Lo sentimos, no podemos recibir tu reserva del ${day} a las ${at}${reason ? ` (${reason})` : ""}. ¿Te gustaría otro horario?`;
        target = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
      }
    }
  } catch (e) {
    target = `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo guardar.")}`;
  }
  revalidatePath(`/mi/${token}/reservas`);
  redirect(target);
}

/** The venue writes down a reservation taken by phone or in person. */
export async function addReservationOwner(f: FormData) {
  const { b, token, back } = await resvAuth(f);
  const clean = (k: string, max: number) => String(f.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  let error = "";
  try {
    await addManualReservation(b.id, { name: clean("name", 80), phone: clean("phone", 30) || null, party: Number(f.get("party")), date: clean("date", 10), time: clean("time", 5), country: clean("country", 40) || null, notes: String(f.get("notes") ?? "").trim().slice(0, 400) || null });
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo guardar.";
  }
  revalidatePath(`/mi/${token}/reservas`);
  redirect(error ? `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}#nueva` : `${back}${back.includes("?") ? "&" : "?"}ok=nueva`);
}

/** Owner: how far ahead, how big a party and how much notice guests need. */
export async function saveReservationSettingsOwner(f: FormData) {
  const { b, token } = await resvAuth(f);
  if ((await accessRole(b)) !== "owner") redirect(`/mi/${token}/reservas`);
  await saveReservationSettings(b.id, { max_party: Number(f.get("max_party")), days_ahead: Number(f.get("days_ahead")), min_notice_hours: Number(f.get("min_notice_hours")) });
  revalidatePath(`/mi/${token}/reservas`);
  redirect(`/mi/${token}/reservas?ok=ajustes#ajustes`);
}

// ---------- Soporte and Capacitación ----------

async function ownerCtx(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  const role = b ? await accessRole(b) : null;
  if (!b || !role) redirect("/");
  return { b, role, token };
}

/** The owner or manager opens a support request. */
export async function openSupport(f: FormData) {
  const { b, role, token } = await ownerCtx(f);
  let id = "", error = "";
  try {
    id = (await openTicket({ id: b.id, name: b.name }, role, String(f.get("subject") ?? ""), String(f.get("category") ?? ""), String(f.get("body") ?? ""))).id;
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo enviar.";
  }
  revalidatePath(`/mi/${token}/soporte`);
  redirect(error ? `/mi/${token}/soporte?error=${encodeURIComponent(error)}#nueva` : `/mi/${token}/soporte?t=${id}&ok=enviada`);
}

/** A reply in one of this business's requests. */
export async function replySupport(f: FormData) {
  const { b, role, token } = await ownerCtx(f);
  const id = String(f.get("ticket_id") ?? "");
  let error = "";
  try {
    if (f.get("resolve") === "1") await setTicketStatus(id, "resolved", { businessId: b.id });
    else await replyTicket(id, role, String(f.get("body") ?? ""), { businessId: b.id });
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo enviar.";
  }
  revalidatePath(`/mi/${token}/soporte`);
  redirect(`/mi/${token}/soporte?t=${id}${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

/** Marks a training guide as read (or not) for the owner or manager. */
export async function markGuide(f: FormData) {
  const { b, role, token } = await ownerCtx(f);
  const guide = String(f.get("guide") ?? "").slice(0, 40);
  if (f.get("done") === "1") await db().from("training_progress").upsert({ business_id: b.id, guide, role });
  else await db().from("training_progress").delete().eq("business_id", b.id).eq("guide", guide).eq("role", role);
  revalidatePath(`/mi/${token}/ayuda`);
  redirect(`/mi/${token}/ayuda#${guide}`);
}
