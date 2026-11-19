import "server-only";
import { createHash, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { asAvatar, randomAvatar, type AvatarBody, type AvatarConfig } from "./avatar";
import { sendPush } from "./push";
import { reviewUrlFrom } from "./site";
import { db } from "./supabase";

// Restaurants: employees, branches and internal service ratings. Ratings never go to Google:
// they are the restaurant's own private feedback. Every query is scoped to one business.

export type Branch = { id: string; business_id: string; name: string; address: string | null; google_review_url: string | null; sort: number; active: boolean };
export type StaffMember = { id: string; business_id: string; branch_id: string | null; ref: string; name: string; title: string; message: string | null; avatar: AvatarConfig; active: boolean; approved: boolean; deleted_at: string | null; is_demo: boolean; created_at: string };
export type Rating = { id: string; business_id: string; branch_id: string | null; staff_id: string | null; tag_id: string | null; source: "waiter" | "table"; rating: number; comment: string | null; issue: string | null; status: "new" | "seen" | "resolved"; created_at: string };

export const ISSUES: Record<string, string> = { wait: "Demora", order: "Pedido equivocado", food: "La comida", service: "La atención", clean: "Limpieza", bill: "La cuenta", other: "Otro" };
/** Fewer ratings than this and the person is listed, but not ranked: the sample is too small. */
export const MIN_RATINGS = 5;

const REF = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRef = () => Array.from({ length: 5 }, () => REF[randomInt(0, REF.length)]).join("");
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const toStaff = (r: Record<string, unknown>) => ({ ...(r as StaffMember), avatar: asAvatar(r.avatar, String(r.id)) });

// ---------- Branches ----------

export async function branchesFor(businessId: string): Promise<Branch[]> {
  const { data } = await db().from("branches").select("*").eq("business_id", businessId).order("sort").order("created_at");
  return (data ?? []) as Branch[];
}

export async function saveBranch(businessId: string, f: { id?: string; name: string; address?: string; review?: string; active?: boolean }) {
  const name = clean(f.name, 60);
  if (name.length < 2) throw new Error("Escribe el nombre de la sucursal.");
  const review = f.review?.trim() ? reviewUrlFrom(f.review) : null;
  const row = { business_id: businessId, name, address: clean(f.address, 160) || null, google_review_url: review, active: f.active !== false };
  const q = f.id ? db().from("branches").update(row).eq("id", f.id).eq("business_id", businessId) : db().from("branches").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

// ---------- Employees ----------

export async function staffFor(businessId: string, o: { activeOnly?: boolean; branchId?: string | null; deleted?: boolean } = {}): Promise<StaffMember[]> {
  let q = db().from("staff").select("*").eq("business_id", businessId).order("active", { ascending: false }).order("name");
  q = o.deleted ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  if (o.activeOnly) q = q.eq("active", true);
  if (o.branchId) q = q.or(`branch_id.eq.${o.branchId},branch_id.is.null`);
  const { data } = await q;
  return (data ?? []).map(toStaff);
}

export async function staffMember(businessId: string, idOrRef: string): Promise<StaffMember | null> {
  const col = /^[0-9a-f-]{36}$/.test(idOrRef) ? "id" : "ref";
  if (col === "ref" && !/^[A-Z0-9]{5}$/.test(idOrRef)) return null;
  const { data } = await db().from("staff").select("*").eq("business_id", businessId).eq(col, idOrRef).maybeSingle();
  return data ? toStaff(data) : null;
}

export async function saveStaffMember(businessId: string, f: { id?: string; name: string; title?: string; message?: string; branch_id?: string | null; active?: boolean; avatar?: Partial<AvatarConfig> }) {
  const name = clean(f.name, 50);
  if (name.length < 2) throw new Error("Escribe el nombre del empleado.");
  if (f.branch_id) {
    const { data: br } = await db().from("branches").select("id").eq("id", f.branch_id).eq("business_id", businessId).maybeSingle();
    if (!br) throw new Error("Esa sucursal no es de este negocio.");
  }
  const row = {
    name, title: clean(f.title, 30) || "Mesero", message: clean(f.message, 140) || null,
    branch_id: f.branch_id || null, active: f.active !== false, avatar: asAvatar(f.avatar, f.id ?? name),
  };
  if (f.id) {
    const { data, error } = await db().from("staff").update(row).eq("id", f.id).eq("business_id", businessId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Ese empleado no es de este negocio.");
    // Waiter cards show the current name.
    await db().from("tags").update({ staff_name: name }).eq("staff_id", f.id).eq("business_id", businessId);
    return f.id;
  }
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db().from("staff").insert({ ...row, business_id: businessId, ref: newRef() }).select("id").single();
    if (!error) return data.id as string;
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error("No se pudo crear el empleado. Inténtalo otra vez.");
}

/** Points a waiter card at an employee (or frees it). Fixes mixed-up cards in one step; history stays with the employee. */
export async function linkPlaque(businessId: string, tagId: string, staffId: string | null) {
  const { data: t } = await db().from("tags").select("id, kind").eq("id", tagId).eq("business_id", businessId).maybeSingle();
  if (!t) throw new Error("Esa placa no es de este negocio.");
  let name: string | null = null;
  if (staffId) {
    const s = await staffMember(businessId, staffId);
    if (!s) throw new Error("Ese empleado no es de este negocio.");
    name = s.name;
  }
  const { error } = await db().from("tags").update({ staff_id: staffId, staff_name: name, staff_since: new Date().toISOString(), kind: staffId ? "waiter" : t.kind }).eq("id", tagId).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

export async function setPlaqueBranch(businessId: string, tagId: string, branchId: string | null) {
  if (branchId) {
    const { data } = await db().from("branches").select("id").eq("id", branchId).eq("business_id", businessId).maybeSingle();
    if (!data) throw new Error("Esa sucursal no es de este negocio.");
  }
  const { error } = await db().from("tags").update({ branch_id: branchId }).eq("id", tagId).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

// ---------- Ratings ----------

async function clientHash(salt: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim();
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${h.get("user-agent") ?? ""}|${day}|${salt}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("base64url").slice(0, 32);
}

/** A guest rates the person who served them. One rating per phone and person every 6 hours. */
export async function submitRating(o: { businessId: string; branchId: string | null; staffId: string; tagId: string; source: "waiter" | "table"; rating: number; comment: string; issue: string; device: string; businessName: string; staffName: string; tableLabel: string; ownerToken: string; isDemo?: boolean }) {
  const rating = Math.round(o.rating);
  if (!(rating >= 1 && rating <= 5)) throw new Error("Elige de 1 a 5 estrellas.");
  const issue = ISSUES[o.issue] ? o.issue : null;
  const ch = await clientHash(o.staffId);
  const since6h = new Date(Date.now() - 6 * 3600_000).toISOString();
  const since1h = new Date(Date.now() - 3600_000).toISOString();
  const [mine, flood] = await Promise.all([
    db().from("service_ratings").select("id", { count: "exact", head: true }).eq("staff_id", o.staffId).eq("client_hash", ch).gte("created_at", since6h),
    db().from("service_ratings").select("id", { count: "exact", head: true }).eq("business_id", o.businessId).gte("created_at", since1h),
  ]);
  if ((mine.count ?? 0) > 0) return { duplicate: true };
  if ((flood.count ?? 0) > 400) throw new Error("Hay muchas evaluaciones en este momento. Inténtalo en unos minutos.");
  const { error } = await db().from("service_ratings").insert({
    business_id: o.businessId, branch_id: o.branchId, staff_id: o.staffId, tag_id: o.tagId, source: o.source,
    rating, comment: clean(o.comment, 600) || null, issue, device: o.device, client_hash: ch, is_demo: Boolean(o.isDemo),
  });
  if (error) throw new Error(error.message);
  // Important problems reach the owner and the manager at once.
  if (rating <= 2 || issue) {
    await sendPush({ role: ["owner", "manager"], businessId: o.businessId }, {
      title: `Atención · ${o.staffName}${o.tableLabel ? ` · ${o.tableLabel}` : ""}`,
      body: `${"★".repeat(rating)}${"☆".repeat(5 - rating)}${issue ? ` · ${ISSUES[issue]}` : ""}${o.comment ? ` · “${clean(o.comment, 90)}”` : ""}`,
      url: `/mi/${o.ownerToken}/experiencia`,
    }).catch(() => 0);
  }
  return { duplicate: false };
}

export async function ratingsFor(businessId: string, o: { from: string; to?: string; branchId?: string | null; staffId?: string | null; limit?: number }): Promise<Rating[]> {
  let q = db().from("service_ratings").select("*").eq("business_id", businessId).gte("created_at", o.from).order("created_at", { ascending: false }).limit(o.limit ?? 20000);
  if (o.to) q = q.lt("created_at", o.to);
  if (o.branchId) q = q.eq("branch_id", o.branchId);
  if (o.staffId) q = q.eq("staff_id", o.staffId);
  const { data } = await q;
  return (data ?? []) as Rating[];
}

export async function setRatingStatus(businessId: string, id: string, status: "seen" | "resolved" | "new") {
  const { error } = await db().from("service_ratings").update({ status, reviewed_at: status === "new" ? null : new Date().toISOString() }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

// ---------- Performance ----------

export type PerfRow = { staff: StaffMember; n: number; avg: number | null; score: number | null; ranked: boolean; google: number; comments: number; low: number; last: string | null };

/**
 * Ranking with a transparent rule: an adjusted average that pulls small samples toward the team's
 * average (5 "virtual" ratings at the team average), and only people with at least MIN_RATINGS are
 * ranked. Everyone always shows how many ratings their number comes from.
 */
export function rankStaff(staff: StaffMember[], ratings: Rating[], googleByStaff: Map<string, number>): { rows: PerfRow[]; teamAvg: number | null; total: number } {
  const total = ratings.length;
  const teamAvg = total ? ratings.reduce((n, r) => n + r.rating, 0) / total : null;
  const prior = teamAvg ?? 4;
  const rows = staff.map((s) => {
    const mine = ratings.filter((r) => r.staff_id === s.id);
    const sum = mine.reduce((n, r) => n + r.rating, 0);
    const n = mine.length;
    return {
      staff: s, n,
      avg: n ? Math.round((sum / n) * 10) / 10 : null,
      score: n ? Math.round(((sum + 5 * prior) / (n + 5)) * 100) / 100 : null,
      ranked: n >= MIN_RATINGS,
      google: googleByStaff.get(s.id) ?? 0,
      comments: mine.filter((r) => r.comment).length,
      low: mine.filter((r) => r.rating <= 2).length,
      last: mine[0]?.created_at ?? null,
    };
  });
  rows.sort((a, z) => Number(z.ranked) - Number(a.ranked) || (z.score ?? 0) - (a.score ?? 0) || z.n - a.n || a.staff.name.localeCompare(z.staff.name, "es"));
  return { rows, teamAvg: teamAvg === null ? null : Math.round(teamAvg * 10) / 10, total };
}

/** Guests each person sent to Google from their own card in the period (a click, not a confirmed review). */
export async function googleClicksByStaff(businessId: string, from: string, to?: string) {
  const { data: tags } = await db().from("tags").select("id, staff_id").eq("business_id", businessId).not("staff_id", "is", null);
  const byTag = new Map(((tags ?? []) as { id: string; staff_id: string }[]).map((t) => [t.id, t.staff_id]));
  const out = new Map<string, number>();
  if (!byTag.size) return out;
  let q = db().from("events").select("tag_id").eq("type", "review_click").in("tag_id", [...byTag.keys()]).gte("created_at", from).limit(50000);
  if (to) q = q.lt("created_at", to);
  const { data } = await q;
  for (const e of (data ?? []) as { tag_id: string }[]) { const s = byTag.get(e.tag_id); if (s) out.set(s, (out.get(s) ?? 0) + 1); }
  return out;
}

/** Average and count per bucket (weeks or months), oldest first, for the evolution charts. */
export function buckets(ratings: Rating[], kind: "week" | "month", count: number) {
  const now = new Date();
  const list: { label: string; from: number; to: number; n: number; avg: number | null }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let from: Date, to: Date, label: string;
    if (kind === "week") {
      to = new Date(now.getTime() - i * 7 * 86_400_000); from = new Date(to.getTime() - 7 * 86_400_000);
      label = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" }).format(from);
    } else {
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 5)); to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1, 5));
      label = new Intl.DateTimeFormat("es-PA", { month: "short", timeZone: "America/Panama" }).format(new Date(from.getTime() + 86_400_000));
    }
    const mine = ratings.filter((r) => { const t = Date.parse(r.created_at); return t >= from.getTime() && t < to.getTime(); });
    list.push({ label, from: from.getTime(), to: to.getTime(), n: mine.length, avg: mine.length ? Math.round((mine.reduce((n, r) => n + r.rating, 0) / mine.length) * 10) / 10 : null });
  }
  return list;
}

// ---------- Customer experience ----------

const TOPICS: { key: string; label: string; re: RegExp }[] = [
  { key: "wait", label: "Demora", re: /demor|tard|esper|lent/i },
  { key: "food", label: "La comida", re: /fr[ií]a|crud|sabor|quemad|salad|insípid|comida/i },
  { key: "service", label: "La atención", re: /grosero|antip[aá]tic|mala atenci|ignor|mal trato|actitud/i },
  { key: "order", label: "Pedido equivocado", re: /equivoc|falt[oó]|incomplet|no era|otro plato/i },
  { key: "clean", label: "Limpieza", re: /sucio|limpi|ba[ñn]o|mosca/i },
  { key: "bill", label: "La cuenta", re: /cobr|cuenta|precio|caro|propina/i },
  { key: "place", label: "El ambiente", re: /ruido|m[uú]sica|calor|aire|fr[ií]o el local|estacionam/i },
];

/** Recurring problems: what guests mark and what they write, counted together. */
export function topics(ratings: Rating[], messages: { message: string }[]) {
  const count = new Map<string, number>();
  for (const r of ratings) {
    if (r.issue && r.issue !== "other") count.set(r.issue, (count.get(r.issue) ?? 0) + 1);
    if (r.rating <= 3 && r.comment) for (const t of TOPICS) if (t.re.test(r.comment) && t.key !== r.issue) count.set(t.key, (count.get(t.key) ?? 0) + 1);
  }
  for (const m of messages) for (const t of TOPICS) if (t.re.test(m.message)) count.set(t.key, (count.get(t.key) ?? 0) + 1);
  return TOPICS.map((t) => ({ key: t.key, label: t.label, n: count.get(t.key) ?? 0 })).filter((t) => t.n > 0).sort((a, z) => z.n - a.n);
}


// ---------- Who guests can see, and the life of an employee ----------

/**
 * Who appears to guests ("Who served you?" and their own card): active, approved and not deleted.
 * In a live venue they also need an active card of their own; in a sales demo the sample team shows as is.
 */
export async function publicStaff(businessId: string, branchId: string | null, demo: boolean): Promise<StaffMember[]> {
  const team = (await staffFor(businessId, { activeOnly: true, branchId })).filter((s) => s.approved);
  if (demo) return team;
  const { data } = await db().from("tags").select("staff_id").eq("business_id", businessId).eq("active", true).not("staff_id", "is", null);
  const carded = new Set(((data ?? []) as { staff_id: string }[]).map((t) => t.staff_id));
  return team.filter((s) => carded.has(s.id));
}

export const isPublic = (s: StaffMember | null) => Boolean(s && s.active && s.approved && !s.deleted_at);

export type PlaqueState = "active" | "disabled" | "unassigned";
/** A waiter card is active (works and opens its person), disabled (opens nothing), or free to give to someone. */
export const plaqueState = (t: { active: boolean; kind: string; staff_id?: string | null }): PlaqueState =>
  !t.active ? "disabled" : t.kind === "waiter" && !t.staff_id ? "unassigned" : "active";
export const PLAQUE_LABEL: Record<PlaqueState, string> = { active: "Activa", disabled: "Desactivada", unassigned: "Sin asignar" };

export async function setStaffActive(businessId: string, id: string, active: boolean) {
  const { data, error } = await db().from("staff").update({ active }).eq("id", id).eq("business_id", businessId).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ese empleado no es de este negocio.");
}

/**
 * Someone leaves: hidden from guests and lists, their cards switched off and freed, and their
 * history (ratings, stats) kept intact. Nothing about their past is deleted.
 */
export async function removeStaff(businessId: string, id: string) {
  const now = new Date().toISOString();
  const { data, error } = await db().from("staff").update({ active: false, deleted_at: now }).eq("id", id).eq("business_id", businessId).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ese empleado no es de este negocio o ya fue eliminado.");
  await db().from("tags").update({ active: false, staff_id: null, staff_name: null, staff_since: now }).eq("business_id", businessId).eq("staff_id", id);
}

export async function restoreStaff(businessId: string, id: string) {
  const { error } = await db().from("staff").update({ deleted_at: null, active: false }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

/** Switch a card on or off. A card switched off opens nothing, even from a saved link. */
export async function setPlaqueActive(businessId: string, tagId: string, active: boolean) {
  const { data, error } = await db().from("tags").update({ active }).eq("id", tagId).eq("business_id", businessId).neq("status", "retired").select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Esa placa no es de este negocio.");
}

// ---------- Automatic avatars ----------

/** A first guess of the figure from the first name (Spanish names ending in "a"); the owner can switch it. */
export function guessBody(name: string): AvatarBody {
  const first = name.trim().split(/\s+/)[0]!.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^(luca|joshua|elias|nicolas|tomas|jonas|andrea s)$/.test(first)) return "m";
  return /a$|ia$|ela$|ina$|riz$|ilda$|beth$|ruth$|iris$|ines$|carmen$|isabel$|raquel$|mabel$|abigail$|yaneth$|lisbeth$/.test(first) ? "f" : "m";
}

/** Adds several people at once, each with an automatic avatar, waiting for approval before guests see them. */
export async function addStaffBatch(businessId: string, names: string[], o: { branchId?: string | null; title?: string }) {
  const clean_ = [...new Set(names.map((n) => clean(n, 50)).filter((n) => n.length >= 2))].slice(0, 60);
  if (!clean_.length) throw new Error("Escribe al menos un nombre (uno por línea).");
  const ids: string[] = [];
  for (const name of clean_) {
    const id = await saveStaffMember(businessId, { name, title: o.title || "Mesero", branch_id: o.branchId ?? null, avatar: randomAvatar(guessBody(name)) });
    await db().from("staff").update({ approved: false }).eq("id", id).eq("business_id", businessId);
    ids.push(id);
  }
  return ids;
}

export async function regenerateAvatar(businessId: string, id: string, body?: AvatarBody) {
  const s = await staffMember(businessId, id);
  if (!s) throw new Error("Ese empleado no es de este negocio.");
  const next = randomAvatar(body ?? s.avatar.body, s.avatar);
  const { error } = await db().from("staff").update({ avatar: next, approved: false }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

export async function approveStaff(businessId: string, ids: string[]) {
  if (!ids.length) return;
  const { error } = await db().from("staff").update({ approved: true, active: true }).eq("business_id", businessId).in("id", ids).is("deleted_at", null);
  if (error) throw new Error(error.message);
}

// ---------- From sales demo to the venue's own system ----------

/**
 * Activation: the sample team and every sample rating leave (unless the owner keeps someone, who then
 * starts with no ratings), and the venue stops being a demo. Real data is never touched.
 */
export async function activateVenue(businessId: string, keep: string[]) {
  await db().from("service_ratings").delete().eq("business_id", businessId).eq("is_demo", true);
  const { data: demo } = await db().from("staff").select("id").eq("business_id", businessId).eq("is_demo", true);
  const ids = ((demo ?? []) as { id: string }[]).map((x) => x.id);
  const drop = ids.filter((id) => !keep.includes(id));
  if (drop.length) {
    await db().from("tags").update({ staff_id: null, staff_name: null }).eq("business_id", businessId).in("staff_id", drop);
    await db().from("staff").delete().eq("business_id", businessId).in("id", drop);
  }
  const kept = ids.filter((id) => keep.includes(id));
  if (kept.length) await db().from("staff").update({ is_demo: false }).eq("business_id", businessId).in("id", kept);
  const { error } = await db().from("businesses").update({ is_demo: false }).eq("id", businessId);
  if (error) throw new Error(error.message);
}
