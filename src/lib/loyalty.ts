// FiveTap's thank-you for its most loyal clients. After a full year of monthly payments, the
// next 3 monthly charges carry a discount, and it comes back every year they stay.
// Example at 15%: $140 → $119 three times (the client saves $63; FiveTap keeps ~96% of the year).
// Computed from the payments every time (nothing stored), so it is applied the same way in
// renewals, reminders, the founder's charges and the receipt. Client-safe.

export const LOYALTY = {
  /** Monthly payments needed before the reward (12 = one year). */
  afterMonths: 12,
  /** How many monthly charges get the discount each year. */
  months: 3,
  /** Discount on each of those charges, in percent. */
  pct: 15,
} as const;

export type LoyaltyCharge = { pct: number; n: number; of: number; regular: number; saved: number };
export type LoyaltyStatus = {
  /** Monthly payments made so far. */
  paid: number;
  /** Months left until the next reward starts (0 while it is running). */
  monthsToGo: number;
  /** The reward running on the next charge, if any. */
  active: LoyaltyCharge | null;
  /** Years completed with FiveTap. */
  years: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Position of a charge (1 = first monthly payment) inside the reward window, or 0. */
function windowSlot(chargeNumber: number) {
  const { afterMonths, months } = LOYALTY;
  if (chargeNumber <= afterMonths) return 0;
  const k = (chargeNumber - afterMonths - 1) % afterMonths; // 0-based inside each year after the first
  return k < months ? k + 1 : 0;
}

/** The discount on the next monthly charge, given how many monthly payments were already made. */
export function loyaltyFor(paidMonthly: number, fee: number): LoyaltyCharge | null {
  const slot = windowSlot(paidMonthly + 1);
  if (!slot || fee <= 0) return null;
  const amount = round2(fee * (1 - LOYALTY.pct / 100));
  return { pct: LOYALTY.pct, n: slot, of: LOYALTY.months, regular: fee, saved: round2(fee - amount) };
}

export function loyaltyStatus(paidMonthly: number, fee: number): LoyaltyStatus {
  const active = loyaltyFor(paidMonthly, fee);
  let monthsToGo = 0;
  if (!active) {
    let next = paidMonthly + 1;
    while (!windowSlot(next)) next++;
    monthsToGo = next - (paidMonthly + 1);
  }
  return { paid: paidMonthly, monthsToGo, active, years: Math.floor(paidMonthly / LOYALTY.afterMonths) };
}

/** What a loyal client saves per year with the reward. */
export const yearlySaving = (fee: number) => round2(fee * (LOYALTY.pct / 100) * LOYALTY.months);
