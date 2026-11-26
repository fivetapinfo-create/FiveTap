"use server";

import { assertAdmin } from "@/lib/admin-guard";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addStaffBatch, approveStaff, linkPlaque, regenerateAvatar, removeStaff, restoreStaff, setStaffActive } from "@/lib/staff";
import { db } from "@/lib/supabase";
import { newCode } from "@/lib/codes";

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
  await assertAdmin();
  await run(f, "meseros-agregados", async (businessId) => {
    const lines = (k: string) => String(f.get(k) ?? "").split(/\r?\n|,/).map((n) => n.trim()).filter(Boolean);
    const men = lines("names_m"), women = lines("names_f");
    // The simple form: one name and man or woman.
    const one = String(f.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
    if (one) (f.get("body") === "f" ? women : men).push(one);
    if (!men.length && !women.length) throw new Error("Escribe al menos un nombre.");
    // Optional branch: only one of this business's own branches.
    let branchId: string | null = null;
    const wanted = String(f.get("branch_id") ?? "");
    if (wanted) {
      const { data: br } = await db().from("branches").select("id").eq("id", wanted).eq("business_id", businessId).maybeSingle();
      if (!br) throw new Error("Esa sucursal no es de este negocio.");
      branchId = br.id;
    }
    const ids = [
      ...(men.length ? await addStaffBatch(businessId, men, { body: "m", branchId }) : []),
      ...(women.length ? await addStaffBatch(businessId, women, { body: "f", branchId }) : []),
    ];
    await approveStaff(businessId, ids);
    const { data } = await db().from("tags").select("id, label, branch_id").eq("business_id", businessId).eq("kind", "waiter").eq("active", true).is("staff_id", null);
    // Free cards of the same branch first (then cards with no branch), in label order.
    const rank = (t: { branch_id: string | null }) => (branchId ? (t.branch_id === branchId ? 0 : t.branch_id ? 2 : 1) : t.branch_id ? 1 : 0);
    const free = ((data ?? []) as { id: string; label: string; branch_id: string | null }[])
      .filter((t) => !branchId || !t.branch_id || t.branch_id === branchId)
      .sort((a, z) => rank(a) - rank(z) || a.label.localeCompare(z.label, "es", { numeric: true }));
    // No free card left: create the missing ones ("Mesero 1", "Mesero 2"…), so a new waiter
    // always comes out with its own link ready for the chip.
    if (ids.length > free.length) {
      const { count } = await db().from("tags").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "waiter");
      let n = (count ?? 0) + 1;
      for (let k = free.length; k < ids.length; k++) {
        for (let attempt = 0; attempt < 4; attempt++) {
          const { data, error } = await db().from("tags").insert({ business_id: businessId, kind: "waiter", branch_id: branchId, label: `Mesero ${n}`, code: newCode() }).select("id, label, branch_id").single();
          if (data) { free.push(data as { id: string; label: string; branch_id: string | null }); break; }
          if (error && error.code !== "23505") throw new Error(error.message);
        }
        n++;
      }
    }
    for (let i = 0; i < ids.length && i < free.length; i++) await linkPlaque(businessId, free[i].id, ids[i]);
    if (ids.length > free.length) return "meseros-sin-tarjeta";
  });
}

/** One waiter: another look, man/woman, approve, card, on/off, delete or restore. */
export async function adminWaiterOp(f: FormData) {
  await assertAdmin();
  await run(f, "mesero", async (businessId) => {
    const id = String(f.get("id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Mesero no encontrado.");
    const op = String(f.get("op") ?? "");
    if (op === "regenerate") { await regenerateAvatar(businessId, id); await approveStaff(businessId, [id]); }
    else if (op === "body") { await regenerateAvatar(businessId, id, f.get("body") === "f" ? "f" : "m"); await approveStaff(businessId, [id]); }
    else if (op === "approve") await approveStaff(businessId, [id]);
    else if (op === "rename") {
      const name = String(f.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
      if (name.length < 2) throw new Error("Escribe el nombre del mesero.");
      const { error } = await db().from("staff").update({ name }).eq("id", id).eq("business_id", businessId);
      if (error) throw new Error(error.message);
      await db().from("tags").update({ staff_name: name }).eq("business_id", businessId).eq("staff_id", id);
    }
    else if (op === "activate" || op === "deactivate") await setStaffActive(businessId, id, op === "activate");
    else if (op === "branch") {
      const wanted = String(f.get("branch_id") ?? "");
      if (wanted) {
        const { data: br } = await db().from("branches").select("id").eq("id", wanted).eq("business_id", businessId).maybeSingle();
        if (!br) throw new Error("Esa sucursal no es de este negocio.");
      }
      const { error } = await db().from("staff").update({ branch_id: wanted || null }).eq("id", id).eq("business_id", businessId);
      if (error) throw new Error(error.message);
    }
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
