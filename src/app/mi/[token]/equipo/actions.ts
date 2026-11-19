"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { linkPlaque, saveBranch, saveStaffMember, setPlaqueBranch, setRatingStatus } from "@/lib/staff";

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
