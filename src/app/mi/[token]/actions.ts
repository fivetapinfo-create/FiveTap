"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole, renewCode, unlock } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { db } from "@/lib/supabase";
import { saveStaff } from "@/lib/team";
import { deleteItem, deletePromotion, saveItem, savePromotion, setActive } from "@/lib/experience";
import { adjustLine, setOrderStatus, type OrderStatus } from "@/lib/orders";

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
