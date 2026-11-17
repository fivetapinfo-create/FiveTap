// What each FiveTap business may use. One platform, three reference tiers; the business's own
// approved contract (tier + per-business exceptions + timed trials) is what turns each tool on.
// Client-safe: only names and defaults live here; the server resolves and enforces them.

export type Tier = "esencial" | "profesional" | "empresarial";
export const TIERS: { key: Tier; name: string; hint: string }[] = [
  { key: "esencial", name: "Esencial", hint: "Una placa o pocas: página con su marca, reseñas y mensajes" },
  { key: "profesional", name: "Profesional", hint: "Clientes que vuelven y resultados medidos" },
  { key: "empresarial", name: "Empresarial", hint: "Pedidos, reservas, sucursales y gestión completa" },
];

export type FeatureKey =
  | "promos" | "catalog" | "club" | "loyalty" | "clients" | "team" | "reports_full"
  | "orders" | "reservations" | "branches" | "password_login" | "priority_support";

export type Feature = { key: FeatureKey; name: string; what: string; tiers: Tier[] };

/** The catalog. A new tool is added here with tiers: [] so it reaches nobody until the founder decides. */
export const FEATURES: Feature[] = [
  { key: "promos", name: "Promociones en la placa", what: "Publica ofertas con foto y fechas que tus clientes ven al tocar la placa.", tiers: ["profesional", "empresarial"] },
  { key: "catalog", name: "Menú o catálogo", what: "Tus productos o servicios con fotos y precios en la placa.", tiers: ["profesional", "empresarial"] },
  { key: "club", name: "Club de clientes", what: "Tus clientes se unen desde la placa y les envías promociones por WhatsApp.", tiers: ["profesional", "empresarial"] },
  { key: "loyalty", name: "Tarjeta de fidelidad", what: "Tus clientes guardan en su teléfono una tarjeta de sellos con tu marca; al completarla reciben su premio.", tiers: ["profesional", "empresarial"] },
  { key: "clients", name: "Mis clientes", what: "Fichas de cada cliente con sus visitas, cumpleaños y WhatsApp.", tiers: ["profesional", "empresarial"] },
  { key: "team", name: "Equipo y ranking", what: "Tarjetas con el nombre de cada persona y quién lleva más clientes a Google.", tiers: ["profesional", "empresarial"] },
  { key: "reports_full", name: "Reportes completos", what: "Historial completo, comparación por placa y reporte mensual detallado.", tiers: ["profesional", "empresarial"] },
  { key: "orders", name: "Pedidos desde la mesa", what: "Tus clientes piden desde la placa y tú los recibes al instante.", tiers: ["empresarial"] },
  { key: "reservations", name: "Reservas", what: "Reservas en tu horario, confirmadas por WhatsApp.", tiers: ["empresarial"] },
  { key: "branches", name: "Sucursales", what: "Varios locales administrados desde una sola cuenta.", tiers: ["empresarial"] },
  { key: "password_login", name: "Acceso con usuario y contraseña", what: "Cada persona entra con su propio usuario y contraseña.", tiers: ["empresarial"] },
  { key: "priority_support", name: "Soporte prioritario", what: "Respuesta el mismo día hábil y asesoría con el fundador.", tiers: ["empresarial"] },
];
export const featureByKey = (k: string) => FEATURES.find((f) => f.key === k);

export type Limits = { plaques: number; managers: number; promos: number; items: number; historyMonths: number };
export const TIER_LIMITS: Record<Tier, Limits> = {
  esencial: { plaques: 4, managers: 0, promos: 1, items: 20, historyMonths: 3 },
  profesional: { plaques: 30, managers: 1, promos: 10, items: 200, historyMonths: 12 },
  empresarial: { plaques: 500, managers: 10, promos: 1000, items: 5000, historyMonths: 120 },
};
export const LIMIT_LABEL: Record<keyof Limits, string> = { plaques: "Placas y tarjetas activas", managers: "Gerentes con acceso", promos: "Promociones activas", items: "Productos en el catálogo", historyMonths: "Meses de historial" };

/** Per-business contract: each feature forced on/off, timed trials (YYYY-MM-DD) and limit overrides. */
export type Entitlements = { on?: Partial<Record<FeatureKey, boolean>>; trials?: Partial<Record<FeatureKey, string>>; limits?: Partial<Limits>; note?: string };

/** The tier FiveTap suggests from what was sold (the founder can always choose another). */
export function suggestTier(planKey: string | null | undefined, monthly: number): Tier {
  if (planKey === "pro" || planKey === "enterprise" || monthly >= 200) return "empresarial";
  if (planKey === "start" || monthly >= 100) return "profesional";
  return "esencial";
}

/**
 * Quick check without the founder's tier rollout (used where code must stay synchronous, like the
 * Orders and Reservations modules). No tier yet = allowed, as before tiers existed.
 */
export function tierAllows(b: { tier?: string | null; entitlements?: unknown }, key: FeatureKey) {
  if (!b.tier) return true;
  const e = (b.entitlements && typeof b.entitlements === "object" ? b.entitlements : {}) as Entitlements;
  if (typeof e.on?.[key] === "boolean") return e.on[key]!;
  const t = e.trials?.[key];
  if (t && t >= new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)) return true;
  return (featureByKey(key)?.tiers ?? []).includes(b.tier as Tier);
}
