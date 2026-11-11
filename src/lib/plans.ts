// Monthly plans by size of the venue: everything is a subscription (plaques and waiter
// cards included), with a ceiling of plaques per plan. The annual price is 10 months.
// Read by the website and by the billing messages, so both always say the same.

export type Tier = { key: string; name: string; plaques: number; cards: number; monthly: number };

export const TIERS: Tier[] = [
  { key: "una", name: "Una placa", plaques: 1, cards: 0, monthly: 35 },
  { key: "mostrador", name: "Mostrador", plaques: 4, cards: 1, monthly: 79 },
  { key: "esencial", name: "Esencial", plaques: 10, cards: 2, monthly: 129 },
  { key: "crecimiento", name: "Crecimiento", plaques: 20, cards: 4, monthly: 179 },
  { key: "completo", name: "Completo", plaques: 30, cards: 6, monthly: 229 },
  { key: "grande", name: "Grande", plaques: 40, cards: 8, monthly: 269 },
];

/** Extra waiter card on any plan, per month. */
export const EXTRA_CARD_MONTHLY = 5;

/** Above this many plaques (or a chain of venues), the price is quoted. */
export const QUOTE_ABOVE = 40;

export const annualPrice = (t: Tier) => t.monthly * 10;

/** The plan whose monthly price is this fee, if any (custom prices have no plan name). */
export const tierByFee = (fee: number) => TIERS.find((t) => t.monthly === Number(fee)) ?? null;
