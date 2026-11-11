// Monthly plans: everything is a subscription and comes installed with FiveTap Business.
// Plaques (tables, counter) and waiter cards are separate plans: a venue can take one,
// the other or both. The annual price of any plan is 10 months (2 months free).
// Read by the website, /pagar, the terms and the billing messages, so all say the same.

export type Tier = { key: string; name: string; qty: number; monthly: number };

/** Plaques for tables or the counter, by the most a venue can have on the plan. */
export const TIERS: Tier[] = [
  { key: "una", name: "Una placa", qty: 1, monthly: 35 },
  { key: "mostrador", name: "Mostrador", qty: 4, monthly: 79 },
  { key: "esencial", name: "Esencial", qty: 10, monthly: 129 },
  { key: "crecimiento", name: "Crecimiento", qty: 20, monthly: 189 },
  { key: "completo", name: "Completo", qty: 30, monthly: 259 },
  { key: "grande", name: "Grande", qty: 40, monthly: 319 },
  { key: "premium", name: "Premium", qty: 50, monthly: 379 },
];

/** NFC cards with a lanyard for waiters, a plan of their own. */
export const WAITER_TIERS: Tier[] = [
  { key: "mesero-1", name: "1 tarjeta", qty: 1, monthly: 25 },
  { key: "meseros-3", name: "3 tarjetas", qty: 3, monthly: 69 },
  { key: "meseros-5", name: "5 tarjetas", qty: 5, monthly: 109 },
  { key: "meseros-8", name: "8 tarjetas", qty: 8, monthly: 159 },
  { key: "meseros-10", name: "10 tarjetas", qty: 10, monthly: 199 },
];

/** Above this many plaques (or a chain of venues), the price is quoted. */
export const QUOTE_ABOVE = 50;

export const annualPrice = (t: Tier) => t.monthly * 10;
export const perPiece = (t: Tier) => t.monthly / t.qty;

/** The plan whose monthly price is this fee, if any (custom prices have no plan name). */
export function tierByFee(fee: number): { name: string } | null {
  const plaque = TIERS.find((t) => t.monthly === Number(fee));
  if (plaque) return { name: plaque.name };
  const cards = WAITER_TIERS.find((t) => t.monthly === Number(fee));
  return cards ? { name: `Meseros ${cards.name}` } : null;
}
