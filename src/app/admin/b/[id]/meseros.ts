"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addStaffBatch, approveStaff, linkPlaque, regenerateAvatar, removeStaff, restoreStaff, setStaffActive } from "@/lib/staff";
import { db } from "@/lib/supabase";

// Waiters managed from the founder's own panel (/admin/b/[id]): the founder never has to
// jump into the venue's FiveTap Business app to add, review or assign them.

const idOf = (f: FormData) => {
  const id = String(f.get("business_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Negocio no encontrado.");
  return id;
};

async function run(f: FormData, ok: string, work: (businessId: string) => Promise<string | void>) {
  const raw = String(f.get("business_id") ?? "");
  const back = `/admin/b/${/^[0-9a-f-]{36}$/i.test(raw) ? raw : ""}`;
  let done = ok;
  try {
    done = (await work(idOf(f))) || ok;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    redirect(`${back}?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo guardar.")}#meseros-panel`);
  }
  revalidatePath(back);
  redirect(`${back}?ok=${done}#meseros-panel`);
}

/**
 * New waiters, one name per line, split into men and women. Each gets an automatic avatar
 * with the venue's logo, is approved at once and takes the next free waiter card in order.
 */
export async function adminAddWaiters(f: FormData) {
  await run(f, "meseros-agregados", async (businessId) => {
    const lines = (k: string) => String(f.get(k) ?? "").split(/\r?\n|,/).map((n) => n.trim()).filter(Boolean);
    const men = lines("names_m"), women = lines("names_f");
    if (!men.length && !women.length) throw new Error("Escribe al menos un nombre.");
    const ids = [
      ...(men.length ? await addStaffBatch(businessId, men, { body: "m" }) : []),
      ...(women.length ? await addStaffBatch(businessId, women, { body: "f" }) : []),
    ];
    await approveStaff(businessId, ids);
    const { data } = await db().from("tags").select("id, label").eq("business_id", businessId).eq("kind", "waiter").eq("active", true).is("staff_id", null);
    const free = ((data ?? []) as { id: string; label: string }[]).sort((a, z) => a.label.localeCompare(z.label, "es", { numeric: true }));
    for (let i = 0; i < ids.length && i < free.length; i++) await linkPlaque(businessId, free[i].id, ids[i]);
    if (ids.length > free.length) return "meseros-sin-tarjeta";
  });
}

/** One waiter: another look, man/woman, approve, card, on/off, delete or restore. */
export async function adminWaiterOp(f: FormData) {
  await run(f, "mesero", async (businessId) => {
    const id = String(f.get("id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Mesero no encontrado.");
    const op = String(f.get("op") ?? "");
    if (op === "regenerate") { await regenerateAvatar(businessId, id); await approveStaff(businessId, [id]); }
    else if (op === "body") { await regenerateAvatar(businessId, id, f.get("body") === "f" ? "f" : "m"); await approveStaff(businessId, [id]); }
    else if (op === "approve") await approveStaff(businessId, [id]);
    else if (op === "activate" || op === "deactivate") await setStaffActive(businessId, id, op === "activate");
    else if (op === "card") {
      // Free whatever card the waiter had, then give them the chosen one (if any).
      const { data } = await db().from("tags").select("id").eq("business_id", businessId).eq("staff_id", id);
      for (const t of (data ?? []) as { id: string }[]) await linkPlaque(businessId, t.id, null);
      const tag = String(f.get("tag") ?? "");
      if (tag) await linkPlaque(businessId, tag, id);
    } else if (op === "delete") {
      if (f.get("confirm") !== "1") throw new Error("Marca la casilla para confirmar.");
      await removeStaff(businessId, id);
      return "mesero-eliminado";
    } else if (op === "restore") await restoreStaff(businessId, id);
    else throw new Error("Acción no válida.");
  });
}
