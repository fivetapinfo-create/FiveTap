import "server-only";
import { unstable_cache } from "next/cache";
import { FEATURES, TIER_LIMITS, featureByKey, type Entitlements, type FeatureKey, type Limits, type Tier } from "./features";
import { db } from "./supabase";

// Resolves and enforces what a business may use. A business with no tier yet (every business
// that existed before tiers) keeps everything as it was: nothing is taken away by this system.

type Biz = { id: string; tier?: string | null; entitlements?: unknown };

export const ROLLOUT_TAG = "feature-rollout";
/** The founder's decision on which tiers get each feature (overrides the catalog's defaults). */
export const rollout = unstable_cache(
  async () => {
    const { data } = await db().from("feature_rollout").select("key, tiers, paid, note");
    return (data ?? []) as { key: string; tiers: string[]; paid: boolean; note: string | null }[];
  },
  ["feature-rollout-v1"],
  { revalidate: 300, tags: [ROLLOUT_TAG] },
);

export const asEntitlements = (v: unknown): Entitlements => (v && typeof v === "object" ? (v as Entitlements) : {});
const todayPa = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);

export type Access = { tier: Tier | null; legacy: boolean; has: Record<FeatureKey, boolean>; trial: Partial<Record<FeatureKey, string>>; limits: Limits };

/** Everything a business can use right now, in one pass (one cached query). */
export async function accessOf(b: Biz): Promise<Access> {
  const tier = (b.tier as Tier | null) ?? null;
  const e = asEntitlements(b.entitlements);
  const ro = await rollout().catch(() => []);
  const today = todayPa();
  const has = {} as Record<FeatureKey, boolean>;
  const trial: Partial<Record<FeatureKey, string>> = {};
  for (const f of FEATURES) {
    if (!tier) { has[f.key] = true; continue; }
    const tiers = ro.find((r) => r.key === f.key)?.tiers ?? f.tiers;
    let on = tiers.includes(tier);
    if (typeof e.on?.[f.key] === "boolean") on = e.on[f.key]!;
    const t = e.trials?.[f.key];
    if (!on && t && t >= today) { on = true; trial[f.key] = t; }
    has[f.key] = on;
  }
  const base = TIER_LIMITS[tier ?? "empresarial"];
  return { tier, legacy: !tier, has, trial, limits: { ...base, ...(e.limits ?? {}) } };
}

export async function can(b: Biz, key: FeatureKey) {
  return (await accessOf(b)).has[key];
}

/** Server-side guard for actions: throws a friendly message when the tool is not contracted. */
export async function requireFeature(b: Biz, key: FeatureKey) {
  if (!(await can(b, key))) throw new Error(`“${featureByKey(key)?.name ?? key}” no está incluida en tu servicio. Solicita una ampliación para habilitarla.`);
}

/** Founder: saves tier, exceptions, trials and limits, and keeps the history of the change. */
export async function saveEntitlements(businessId: string, next: { tier: Tier | null; entitlements: Entitlements }, reason: string | null) {
  const { data: before } = await db().from("businesses").select("tier, entitlements").eq("id", businessId).maybeSingle();
  if (!before) throw new Error("Negocio no encontrado.");
  const { error } = await db().from("businesses").update({ tier: next.tier, entitlements: next.entitlements }).eq("id", businessId);
  if (error) throw new Error(error.message);
  await db().from("entitlement_log").insert({ business_id: businessId, changes: { from: before, to: next }, reason: reason?.slice(0, 300) || null });
}

export async function entitlementLog(businessId: string, limit = 20) {
  const { data } = await db().from("entitlement_log").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as { id: string; changes: { from: { tier: string | null; entitlements: Entitlements }; to: { tier: string | null; entitlements: Entitlements } }; reason: string | null; created_at: string }[];
}

/** Guard for actions that only have the business id: feature contracted and, when creating, room under its limit. */
export async function guardById(businessId: string, key: FeatureKey, creating?: { table: "promotions" | "catalog_items"; limit: keyof Limits }) {
  const { data: b } = await db().from("businesses").select("id, tier, entitlements").eq("id", businessId).maybeSingle();
  if (!b) throw new Error("Negocio no encontrado.");
  await requireFeature(b, key);
  if (creating) {
    const max = (await accessOf(b)).limits[creating.limit];
    const { count } = await db().from(creating.table).select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true);
    if ((count ?? 0) >= max) throw new Error(`Llegaste al límite de tu servicio (${max}). Pausa uno o solicita una ampliación para agregar más.`);
  }
}
