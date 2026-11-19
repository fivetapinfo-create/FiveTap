"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { activateVenue, addStaffBatch, approveStaff, linkPlaque, regenerateAvatar, removeStaff, restoreStaff, saveBranch, saveStaffMember, setPlaqueActive, setPlaqueBranch, setRatingStatus, setStaffActive } from "@/lib/staff";
import { db } from "@/lib/supabase";

async function ctx(f: FormData, ownerOnly: boolean) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  const role = b ? await accessRole(b) : null;
  if (!b || !role) redirect("/");
  const back = String(f.get("back") ?? "") || `/mi/${token}/equipo`;
  const safe = back.startsWith(`/mi/${token}/`) ? back : `/mi/${token}/equipo`;
  if (!(await can(b, "team"))) redirect(`/mi/${token}/equipo`);
  if (ownerOnly && role !== "owner") redirect(`${safe}${safe.includes("?") ? "&" : "?"}error=${encodeURIComponent("Solo el dueño puede cambiar esto.")}`);
  return { b, role, token, back: safe };
}
const go = (back: string, q: string, hash = "") => redirect(`${back.split("#")[0]}${back.includes("?") ? "&" : "?"}${q}${hash}`);
const msg = (e: unknown) => encodeURIComponent(e instanceof Error ? e.message : "No se pudo guardar.");

export async function saveEmployee(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  let id = "", error = "";
  try {
    id = await saveStaffMember(b.id, {
      id: String(f.get("id") ?? "") || undefined,
      name: String(f.get("name") ?? ""), title: String(f.get("title") ?? ""), message: String(f.get("message") ?? ""),
      branch_id: String(f.get("branch_id") ?? "") || null, active: f.get("active") !== "0",
      avatar: { body: f.get("body") === "f" ? "f" : "m", skin: Number(f.get("skin")), hair: Number(f.get("hair")), hairColor: Number(f.get("hairColor")), brows: Number(f.get("brows")) },
    });
  } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  if (error) go(back, `error=${error}`);
  redirect(`/mi/${token}/equipo/${id}?ok=guardado`);
}

export async function savePlaque(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  let error = "";
  try {
    const tagId = String(f.get("tag") ?? "");
    if (f.has("staff_id")) await linkPlaque(b.id, tagId, String(f.get("staff_id") ?? "") || null);
    if (f.has("branch_id")) await setPlaqueBranch(b.id, tagId, String(f.get("branch_id") ?? "") || null);
  } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  go(back, error ? `error=${error}` : "ok=placa", "#placas");
}

export async function saveBranchAction(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  let error = "";
  try {
    if (!(await can(b, "branches"))) throw new Error("Las sucursales no están incluidas en tu plan.");
    await saveBranch(b.id, { id: String(f.get("id") ?? "") || undefined, name: String(f.get("name") ?? ""), address: String(f.get("address") ?? ""), review: String(f.get("review") ?? ""), active: f.get("active") !== "0" });
  } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  go(back, error ? `error=${error}` : "ok=sucursal", "#sucursales");
}

/** Owner or manager: mark a rating as seen or solved. */
export async function markRating(f: FormData) {
  const { b, back } = await ctx(f, false);
  const s = String(f.get("status") ?? "");
  try { await setRatingStatus(b.id, String(f.get("id") ?? ""), s === "resolved" ? "resolved" : s === "new" ? "new" : "seen"); } catch { /* shown as unchanged */ }
  go(back, "ok=estado");
}

/** Activate, deactivate, delete (keeps history) or restore an employee. Owner only. */
export async function staffStatus(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  const id = String(f.get("id") ?? "");
  const op = String(f.get("op") ?? "");
  let error = "", ok = "estado";
  try {
    if (op === "activate" || op === "deactivate") await setStaffActive(b.id, id, op === "activate");
    else if (op === "delete") {
      if (f.get("confirm") !== "1") throw new Error("Marca la casilla para confirmar.");
      await removeStaff(b.id, id); ok = "eliminado";
    } else if (op === "restore") await restoreStaff(b.id, id);
    else throw new Error("Acción no válida.");
  } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  go(back, error ? `error=${error}` : `ok=${ok}`, "#meseros");
}

/** Switch a card on or off (owner only). */
export async function plaqueActive(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  let error = "";
  try { await setPlaqueActive(b.id, String(f.get("tag") ?? ""), f.get("active") === "1"); } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  go(back, error ? `error=${error}` : "ok=placa", "#placas");
}

/** Several new people at once (one name per line); each gets an automatic avatar to review. */
export async function addStaff(f: FormData) {
  const { b, back, token } = await ctx(f, true);
  let error = "";
  try {
    const lines = (k: string) => String(f.get(k) ?? "").split(/\r?\n|,/);
    const o = { branchId: String(f.get("branch_id") ?? "") || null, title: String(f.get("title") ?? "") };
    const men = lines("names_m").filter((n) => n.trim()), women = lines("names_f").filter((n) => n.trim());
    if (!men.length && !women.length) throw new Error("Escribe al menos un nombre.");
    if (men.length) await addStaffBatch(b.id, men, { ...o, body: "m" });
    if (women.length) await addStaffBatch(b.id, women, { ...o, body: "f" });
  } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}/equipo`);
  if (error) go(back, `error=${error}`, "#meseros");
  redirect(`/mi/${token}/equipo/revisar`);
}

/** Review of the automatic avatars: try another look, switch figure, assign a card, approve. */
export async function reviewStaff(f: FormData) {
  const { b, token } = await ctx(f, true);
  const back = `/mi/${token}/equipo/revisar`;
  const op = String(f.get("op") ?? "");
  const id = String(f.get("id") ?? "");
  let error = "";
  try {
    if (op === "regenerate") await regenerateAvatar(b.id, id);
    else if (op === "body") await regenerateAvatar(b.id, id, f.get("body") === "f" ? "f" : "m");
    else if (op === "card") await linkPlaque(b.id, String(f.get("tag") ?? ""), id || null);
    else if (op === "approve") await approveStaff(b.id, [id]);
    else if (op === "approve-all") {
      const { data } = await db().from("staff").select("id").eq("business_id", b.id).eq("approved", false).is("deleted_at", null);
      await approveStaff(b.id, ((data ?? []) as { id: string }[]).map((x) => x.id));
    } else throw new Error("Acción no válida.");
  } catch (e) { error = msg(e); }
  revalidatePath(back);
  redirect(`${back}?${error ? `error=${error}` : `ok=${op}`}#p-${id}`);
}

/** From sales demo to the venue's own system: sample team and sample ratings leave. Owner (or founder) only. */
export async function activateRestaurant(f: FormData) {
  const { b, token } = await ctx(f, true);
  if (f.get("confirm") !== "1") redirect(`/mi/${token}/activar?error=${encodeURIComponent("Marca la casilla para confirmar.")}`);
  let error = "";
  try { await activateVenue(b.id, f.getAll("keep").map(String)); } catch (e) { error = msg(e); }
  revalidatePath(`/mi/${token}`);
  redirect(error ? `/mi/${token}/activar?error=${error}` : `/mi/${token}/equipo?ok=activado`);
}
