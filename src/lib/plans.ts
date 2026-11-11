import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./supabase";

// The three commercial plans (Start, Pro, Enterprise), all monthly, stored in the
// database and edited from the panel (Planes). The website, /empezar, /pagar, the terms
// and the billing messages all read them from here. Each venue keeps its own price
// (monthly_fee), so a change only applies to new clients.

export type Plan = {
  key: string;
  name: string;
  monthly: number;
  plaques: number;
  cards: number;
  lanyards: number;
  badge: string | null;
  /** Color of the label on the website. */
  badge_color: "neutral" | "blue" | "purple" | "gold";
  features: string[];
  /** PayPal subscription plan (public id), charged by itself every month. */
  paypal_plan: string | null;
  sort: number;
  active: boolean;
};

export const PLANS_TAG = "plans";

/** All plans, cheapest first. Cached for 5 minutes and refreshed at once when edited. */
export const getPlans = unstable_cache(
  async (): Promise<Plan[]> => {
    const { data, error } = await db().from("plans").select("*").order("sort");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ ...p, monthly: Number(p.monthly) })) as Plan[];
  },
  ["plans-v2"],
  { tags: [PLANS_TAG], revalidate: 300 },
);

export async function activePlans() {
  return (await getPlans()).filter((p) => p.active);
}

export async function planByKey(key: string | null | undefined) {
  if (!key) return null;
  return (await getPlans()).find((p) => p.key === key) ?? null;
}

/** The plan a venue is on: its plan_key, or the plan whose price matches its fee. */
export function planOf(b: { plan_key?: string | null; monthly_fee: number }, plans: Plan[]) {
  return plans.find((p) => p.key === b.plan_key) ?? plans.find((p) => p.monthly === Number(b.monthly_fee)) ?? null;
}

/** "10 placas NFC para mesas · 2 tarjetas NFC para meseros con su cordón". */
export function planPieces(p: Pick<Plan, "plaques" | "cards" | "lanyards">) {
  const parts = [`${p.plaques} ${p.plaques === 1 ? "placa NFC" : "placas NFC"} para mesas`];
  if (p.cards) parts.push(`${p.cards} ${p.cards === 1 ? "tarjeta NFC" : "tarjetas NFC"} para meseros${p.lanyards ? ` con ${p.lanyards === p.cards ? (p.cards === 1 ? "su cordón" : "sus cordones") : `${p.lanyards} cordones`}` : ""}`);
  return parts;
}
