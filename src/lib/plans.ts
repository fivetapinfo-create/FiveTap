// Monthly plans: everything is a subscription and comes installed with FiveTap Business.
// Plaques (tables, counter) and waiter cards are separate plans: a venue can take one,
// the other or both. The annual price of any plan is 10 months (2 months free).
// Read by the website, /pagar, the terms and the billing messages, so all say the same.

export type Tier = {
  key: string;
  name: string;
  qty: number;
  monthly: number;
  /** PayPal subscription plan (public id), charged by itself every month. */
  paypalPlan?: string;
};

/** Plaques for tables or the counter, by the most a venue can have on the plan. */
export const TIERS: Tier[] = [
  { key: "una", name: "Una placa", qty: 1, monthly: 35, paypalPlan: "P-4YR42702SY3309026NLEKY4Y" },
  { key: "mostrador", name: "Mostrador", qty: 4, monthly: 79, paypalPlan: "P-6GW556165B051122PNL2MAUA" },
  { key: "esencial", name: "Esencial", qty: 10, monthly: 129, paypalPlan: "P-75J01261M17162054NLZLRPI" },
  { key: "crecimiento", name: "Crecimiento", qty: 20, monthly: 189, paypalPlan: "P-5HJ75473KE688081PNL2MDSY" },
  { key: "completo", name: "Completo", qty: 30, monthly: 259 },
  { key: "grande", name: "Grande", qty: 40, monthly: 319, paypalPlan: "P-0S626060NH124931PNL2ME2I" },
  { key: "premium", name: "Premium", qty: 50, monthly: 379 },
];

/** NFC cards with a lanyard for waiters, a plan of their own. */
export const WAITER_TIERS: Tier[] = [
  { key: "mesero-1", name: "1 tarjeta", qty: 1, monthly: 25, paypalPlan: "P-18B88557JU307035CNL2MGEY" },
  { key: "meseros-3", name: "3 tarjetas", qty: 3, monthly: 69, paypalPlan: "P-38N05111V91958027NL2MHFI" },
  { key: "meseros-5", name: "5 tarjetas", qty: 5, monthly: 109, paypalPlan: "P-51715975LE151450KNL2MINQ" },
  { key: "meseros-8", name: "8 tarjetas", qty: 8, monthly: 159, paypalPlan: "P-7KX11316MM1520808NL2MJJY" },
  { key: "meseros-10", name: "10 tarjetas", qty: 10, monthly: 199, paypalPlan: "P-2SG83244H6461041FNL2MKII" },
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

export type PlanChoice = Tier & { line: "placas" | "meseros"; title: string; detail: string };

/** A plan a venue can subscribe to on /empezar, by its key ("completo", "meseros-5"). */
export function planByKey(key: string | undefined | null): PlanChoice | null {
  const plaque = TIERS.find((t) => t.key === key);
  if (plaque) return { ...plaque, line: "placas", title: `Placas ${plaque.name}`, detail: `${plaque.qty === 1 ? "1 placa NFC instalada" : `Hasta ${plaque.qty} placas NFC instaladas`} · FiveTap Business` };
  const cards = WAITER_TIERS.find((t) => t.key === key);
  if (cards) return { ...cards, line: "meseros", title: `Meseros · ${cards.name}`, detail: `${cards.name} NFC para meseros · FiveTap Business` };
  return null;
}
