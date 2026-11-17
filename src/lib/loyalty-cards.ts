import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";
import type { Business } from "./types";

// The venue's own loyalty card for its customers ("tarjeta de sellos"). The customer joins from the
// plaque and keeps the card on their phone (a web card that installs on the home screen, in the
// venue's colors). Each visit the staff stamps it: they scan the card's QR with their phone camera
// (the first time, that phone asks for the business's access code) or type the card's code in
// FiveTap Business. After N stamps the reward is ready; the staff marks it as delivered.

export type LoyaltyProgram = { business_id: string; enabled: boolean; stamps_needed: number; reward: string; cooldown_hours: number };
export type LoyaltyCard = { id: string; business_id: string; token: string; code: string; name: string; phone: string; stamps: number; rewards: number; last_stamp_at: string | null; created_at: string };
export type CardWithBusiness = LoyaltyCard & { business: Business };

export const DEFAULT_PROGRAM = { enabled: false, stamps_needed: 8, reward: "", cooldown_hours: 3 };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const CARD_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const CARD_TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

export async function programFor(businessId: string): Promise<LoyaltyProgram> {
  const { data } = await db().from("loyalty_programs").select("*").eq("business_id", businessId).maybeSingle();
  return (data as LoyaltyProgram | null) ?? { business_id: businessId, ...DEFAULT_PROGRAM };
}

export async function saveProgram(businessId: string, p: { enabled: boolean; stamps_needed: number; reward: string; cooldown_hours: number }) {
  const stamps = Math.min(20, Math.max(3, Math.round(p.stamps_needed)));
  const cooldown = Math.min(48, Math.max(0, Math.round(p.cooldown_hours)));
  const reward = p.reward.trim().slice(0, 120);
  if (p.enabled && reward.length < 3) throw new Error("Escribe el premio (por ejemplo: “Un café gratis”).");
  const { error } = await db().from("loyalty_programs").upsert({ business_id: businessId, enabled: p.enabled, stamps_needed: stamps, reward, cooldown_hours: cooldown, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join("");

/** Gives the customer their card. The same phone at the same venue gets the same card back. */
export async function joinCard(businessId: string, name: string, phone: string): Promise<LoyaltyCard> {
  const { data: existing } = await db().from("loyalty_cards").select("*").eq("business_id", businessId).eq("phone", phone).maybeSingle();
  if (existing) {
    if (existing.name !== name) await db().from("loyalty_cards").update({ name }).eq("id", existing.id);
    return { ...(existing as LoyaltyCard), name };
  }
  // A ceiling per venue: no more than 40 new cards every 10 minutes (stops scripted sign-ups).
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db().from("loyalty_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "join").gte("created_at", since);
  if ((count ?? 0) >= 40) throw new Error("Demasiadas tarjetas nuevas en poco tiempo. Inténtalo en unos minutos.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db().from("loyalty_cards")
      .insert({ business_id: businessId, token: randomBytes(16).toString("base64url"), code: newCode(), name, phone })
      .select("*").single();
    if (!error && data) {
      await db().from("loyalty_events").insert({ card_id: data.id, business_id: businessId, kind: "join" });
      return data as LoyaltyCard;
    }
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    // Same phone joined at the same time, or a code collision: look again / retry with a new code.
    const again = await db().from("loyalty_cards").select("*").eq("business_id", businessId).eq("phone", phone).maybeSingle();
    if (again.data) return again.data as LoyaltyCard;
  }
  throw new Error("No se pudo crear la tarjeta. Inténtalo otra vez.");
}

export async function cardByToken(token: string): Promise<CardWithBusiness | null> {
  if (!CARD_TOKEN_RE.test(token)) return null;
  const { data } = await db().from("loyalty_cards").select("*, business:businesses(*)").eq("token", token).maybeSingle();
  return (data as CardWithBusiness | null) ?? null;
}

export async function cardByCode(businessId: string, code: string): Promise<LoyaltyCard | null> {
  const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!CARD_CODE_RE.test(c)) return null;
  const { data } = await db().from("loyalty_cards").select("*").eq("business_id", businessId).eq("code", c).maybeSingle();
  return (data as LoyaltyCard | null) ?? null;
}

export type StampResult = { card: LoyaltyCard; complete: boolean };

/** One stamp for this visit. Refused while the waiting time since the last stamp runs, and once the card is full. */
export async function addStamp(card: LoyaltyCard, program: LoyaltyProgram, role: string): Promise<StampResult> {
  if (!program.enabled) throw new Error("La tarjeta de fidelidad está apagada en este negocio.");
  if (card.stamps >= program.stamps_needed) return { card, complete: true };
  if (card.last_stamp_at && program.cooldown_hours > 0) {
    const wait = Date.parse(card.last_stamp_at) + program.cooldown_hours * 3600_000 - Date.now();
    if (wait > 0) {
      const mins = Math.ceil(wait / 60_000);
      throw new Error(`Esta tarjeta ya se selló hace poco. Podrá sellarse otra vez en ${mins >= 60 ? `${Math.ceil(mins / 60)} h` : `${mins} min`}.`);
    }
  }
  const now = new Date().toISOString();
  // Only if nobody stamped it in the meantime (two taps never count twice).
  const { data } = await db().from("loyalty_cards").update({ stamps: card.stamps + 1, last_stamp_at: now })
    .eq("id", card.id).eq("stamps", card.stamps).select("*").maybeSingle();
  if (!data) throw new Error("La tarjeta cambió mientras la sellabas. Ábrela otra vez.");
  await db().from("loyalty_events").insert({ card_id: card.id, business_id: card.business_id, kind: "stamp", by_role: role });
  const next = data as LoyaltyCard;
  return { card: next, complete: next.stamps >= program.stamps_needed };
}

/** The reward was delivered: the card starts again from zero. */
export async function redeemReward(card: LoyaltyCard, program: LoyaltyProgram, role: string): Promise<LoyaltyCard> {
  if (card.stamps < program.stamps_needed) throw new Error("A esta tarjeta todavía le faltan sellos.");
  const { data } = await db().from("loyalty_cards").update({ stamps: 0, rewards: card.rewards + 1 })
    .eq("id", card.id).eq("stamps", card.stamps).select("*").maybeSingle();
  if (!data) throw new Error("La tarjeta cambió mientras la canjeabas. Ábrela otra vez.");
  await db().from("loyalty_events").insert({ card_id: card.id, business_id: card.business_id, kind: "redeem", by_role: role });
  return data as LoyaltyCard;
}

export async function loyaltyStats(businessId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [cards, events, recent] = await Promise.all([
    db().from("loyalty_cards").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db().from("loyalty_events").select("kind").eq("business_id", businessId).gte("created_at", since),
    db().from("loyalty_cards").select("*").eq("business_id", businessId).order("last_stamp_at", { ascending: false, nullsFirst: false }).limit(12),
  ]);
  const ev = (events.data ?? []) as { kind: string }[];
  return {
    cards: cards.count ?? 0,
    joined30: ev.filter((e) => e.kind === "join").length,
    stamps30: ev.filter((e) => e.kind === "stamp").length,
    rewards30: ev.filter((e) => e.kind === "redeem").length,
    recent: (recent.data ?? []) as LoyaltyCard[],
  };
}

// ---------- Which phones may stamp ----------
// A signed cookie, only sent to /tarjeta pages, tied to the business's current access codes and
// passwords: changing a code or a password stops every phone that was stamping with the old one.

const STAMP_COOKIE = "ft_stamp";
type StampKeys = Pick<Business, "id" | "owner_code_enc" | "manager_code_enc"> & { password_epoch?: number | null };
const stampSig = (b: StampKeys, role: string, exp: number) =>
  createHmac("sha256", `fivetap-stamp-v1:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`)
    .update(`${b.id}.${role}.${exp}.${b.owner_code_enc ?? ""}.${b.manager_code_enc ?? ""}.${b.password_epoch ?? 0}`).digest("base64url");

export async function allowStamping(b: StampKeys, role: string) {
  const exp = Date.now() + 180 * 86_400_000;
  (await cookies()).set(STAMP_COOKIE, `${b.id}.${role}.${exp}.${stampSig(b, role, exp)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/tarjeta", maxAge: 180 * 86_400,
  });
}

/** The role of the staff phone stamping this business's cards, or null. */
export async function stampRole(b: StampKeys): Promise<string | null> {
  const [id, role, exp, sig] = ((await cookies()).get(STAMP_COOKIE)?.value ?? "").split(".");
  if (id !== b.id || !role || !exp || !sig || Number(exp) < Date.now()) return null;
  const want = Buffer.from(stampSig(b, role, Number(exp)));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? role : null;
}
