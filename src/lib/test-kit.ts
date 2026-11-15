// FiveTap Test: 1 to 4 pieces (review plaques and waiter cards) with FiveTap Business, valid
// for 30 days. It cancels by itself after day 29 (so it never runs into a second month) and
// the venue picks a plan; what it paid comes off its first month. Asked for by WhatsApp to
// the founder; more pieces or a specific quantity are quoted.

/** What the offer says: valid for 30 days. */
export const TEST_DAYS = 30;
/** Last day the test works; it pauses by itself the day after. */
export const TEST_ACTIVE_DAYS = 29;

/**
 * The public test: priced per piece, from 1 up to TEST_MAX_PIECES pieces, all with FiveTap
 * Business. More pieces or a specific quantity are quoted by the founder. What the venue
 * paid comes off its first month if it picks a plan. (In person the founder can still
 * start a test without the app.)
 */
export const TEST_MAX_PIECES = 4;
export const TEST_OFFER = {
  key: "test-placa",
  name: "FiveTap Test",
  detail: "Placas de reseñas y tarjetas de meseros con FiveTap Business",
  /** Price of one review plaque; the headline "desde" price. */
  price: 40,
  plaque: 40,
  card: 30,
} as const;
/** "Placa $40 · tarjeta de mesero $30 · de 1 a 4 piezas" */
export const TEST_PRICES = `placa de reseñas $${TEST_OFFER.plaque} · tarjeta de mesero $${TEST_OFFER.card} · de 1 a ${TEST_MAX_PIECES} piezas`;

/** The founder's WhatsApp for quotes, as people read it and as wa.me needs it. */
export const FOUNDER_PHONE = "6171-9111";
export const founderWhatsApp = (text: string) => `https://wa.me/50761719111?text=${encodeURIComponent(text)}`;

/**
 * Plan Test · one-time purchases of single pieces (Contratos → Plan Test). A sale, not a
 * subscription: it never creates a monthly charge and never pauses anything.
 */
export const PLAN_TEST_PRODUCTS = {
  plaque: { name: "Placa NFC individual", short: "Placa NFC", unit: 40, kind: "table" as const, label: "Placa" },
  card: { name: "Placa NFC con cordón para el personal", short: "Placa con cordón", unit: 35, kind: "waiter" as const, label: "Personal" },
};
export type PlanTestProduct = keyof typeof PLAN_TEST_PRODUCTS;

/**
 * Pago único: pieces that open the venue's Google review page directly (no FiveTap
 * Business). From 1 to 4 pieces; more pieces or the full system are quoted by the founder.
 * Two exclusive packs of plaques: 2 for $60 and 4 for $110.
 */
export const ONE_TIME = {
  plaque: 40,
  card: 35,
  max: 4,
  packs: [
    { key: "duo", name: "Pack Dúo", qty: 2, price: 60 },
    { key: "local", name: "Pack Local", qty: 4, price: 110 },
  ],
} as const;

/** Unit price by quantity: plaques follow the packs (2–3 at $30, 4+ at $27.50); cards stay at $35. */
export const PLAN_TEST_TIERS: Record<PlanTestProduct, { from: number; unit: number }[]> = {
  plaque: [{ from: 1, unit: 40 }, { from: 2, unit: 30 }, { from: 4, unit: 27.5 }],
  card: [{ from: 1, unit: 35 }],
};
export const packUnit = (p: PlanTestProduct, qty: number) => PLAN_TEST_TIERS[p].filter((t) => qty >= t.from).at(-1)!.unit;
/** One-tap packs in the sales form (only plaques have packs). */
export const PLAN_TEST_PACKS: Record<PlanTestProduct, number[]> = { plaque: [2, 4], card: [] };
