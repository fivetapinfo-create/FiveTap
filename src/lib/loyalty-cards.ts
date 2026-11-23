import "server-only";
import { CARD_CONSENT_VERSION } from "./legal";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sendPush } from "./push";
import { db } from "./supabase";
import type { Business } from "./types";

// The venue's own loyalty card for its customers ("tarjeta de sellos"). The customer joins from the
// plaque and keeps the card on their phone (a web card that installs on the home screen, in the
// venue's colors). Each visit the staff stamps it: they scan the card's QR with their phone camera
// (the first time, that phone asks for the business's access code) or type the card's code in
// FiveTap Business. After N stamps the reward is ready; the staff marks it as delivered.

export type LoyaltyProgram = { business_id: string; enabled: boolean; stamps_needed: number; reward: string; cooldown_hours: number; name: string; terms: string };
export type LoyaltyCard = { id: string; business_id: string; token: string; code: string; name: string; phone: string; stamps: number; rewards: number; last_stamp_at: string | null; created_at: string; reward_code: string | null; reward_ready_at: string | null };
export type LoyaltyEvent = { id: string; kind: "join" | "stamp" | "redeem"; by_role: string | null; method: string | null; reward_code: string | null; created_at: string };
export type CardWithBusiness = LoyaltyCard & { business: Business };

export const DEFAULT_PROGRAM = { enabled: false, stamps_needed: 8, reward: "", cooldown_hours: 3, name: "", terms: "" };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const CARD_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const CARD_TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

export async function programFor(businessId: string): Promise<LoyaltyProgram> {
  const { data } = await db().from("loyalty_programs").select("*").eq("business_id", businessId).maybeSingle();
  return (data as LoyaltyProgram | null) ?? { business_id: businessId, ...DEFAULT_PROGRAM };
}

export async function saveProgram(businessId: string, p: { enabled: boolean; stamps_needed: number; reward: string; cooldown_hours: number; name?: string; terms?: string }) {
  const stamps = Math.min(20, Math.max(3, Math.round(p.stamps_needed)));
  const cooldown = Math.min(48, Math.max(0, Math.round(p.cooldown_hours)));
  const reward = p.reward.trim().slice(0, 120);
  if (p.enabled && reward.length < 3) throw new Error("Escribe el premio (por ejemplo: “Un café gratis”).");
  const { error } = await db().from("loyalty_programs").upsert({ business_id: businessId, enabled: p.enabled, stamps_needed: stamps, reward, cooldown_hours: cooldown, name: (p.name ?? "").trim().slice(0, 40), terms: (p.terms ?? "").trim().slice(0, 500), updated_at: new Date().toISOString() });
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
      .insert({ business_id: businessId, token: randomBytes(16).toString("base64url"), code: newCode(), name, phone, consent_version: CARD_CONSENT_VERSION, consent_at: new Date().toISOString() })
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
const rewardCode = () => `R${Array.from({ length: 6 }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join("")}`;

/**
 * One verified visit. Refused while the waiting time since the last stamp runs, and once the card
 * is full. The stamp that completes the card also creates its single-use reward code.
 */
export async function addStamp(card: LoyaltyCard, program: LoyaltyProgram, role: string, method: "qr" | "app" | "visit_code" = "qr"): Promise<StampResult> {
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
  const full = card.stamps + 1 >= program.stamps_needed;
  const patch: Record<string, unknown> = { stamps: card.stamps + 1, last_stamp_at: now };
  if (full) { patch.reward_code = rewardCode(); patch.reward_ready_at = now; }
  // Only if nobody stamped it in the meantime (two taps never count twice).
  const { data } = await db().from("loyalty_cards").update(patch).eq("id", card.id).eq("stamps", card.stamps).select("*").maybeSingle();
  if (!data) throw new Error("La tarjeta cambió mientras la sellabas. Ábrela otra vez.");
  await db().from("loyalty_events").insert({ card_id: card.id, business_id: card.business_id, kind: "stamp", by_role: role, method });
  const next = data as LoyaltyCard;
  const left = program.stamps_needed - next.stamps;
  // Reminders only reach customers who asked for them on their card.
  if (full) await sendPush({ role: "customer", cardId: card.id }, { title: "¡Tu recompensa está lista!", body: `${program.reward}. Muestra tu tarjeta en caja para recibirla.`, url: `/tarjeta/${card.token}` }).catch(() => 0);
  else if (left <= 2) await sendPush({ role: "customer", cardId: card.id }, { title: `¡Ya tienes ${next.stamps} de ${program.stamps_needed}!`, body: `Te ${left === 1 ? "falta 1 visita" : `faltan ${left} visitas`} para: ${program.reward}.`, url: `/tarjeta/${card.token}` }).catch(() => 0);
  return { card: next, complete: full };
}

/** The reward was delivered: checked against its single-use code, then the card starts again from zero. */
export async function redeemReward(card: LoyaltyCard, program: LoyaltyProgram, role: string, code?: string): Promise<LoyaltyCard> {
  if (card.stamps < program.stamps_needed || !card.reward_code) throw new Error("Esta tarjeta no tiene un premio pendiente (o ya se entregó).");
  if (code !== undefined && code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") !== card.reward_code) throw new Error("El código del premio no coincide.");
  const { data } = await db().from("loyalty_cards").update({ stamps: 0, rewards: card.rewards + 1, reward_code: null, reward_ready_at: null })
    .eq("id", card.id).eq("stamps", card.stamps).eq("reward_code", card.reward_code).select("*").maybeSingle();
  if (!data) throw new Error("Este premio ya se entregó.");
  await db().from("loyalty_events").insert({ card_id: card.id, business_id: card.business_id, kind: "redeem", by_role: role, reward_code: card.reward_code });
  return data as LoyaltyCard;
}

export async function cardByRewardCode(businessId: string, code: string): Promise<LoyaltyCard | null> {
  const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^R[A-HJ-NP-Z2-9]{6}$/.test(c)) return null;
  const { data } = await db().from("loyalty_cards").select("*").eq("business_id", businessId).eq("reward_code", c).maybeSingle();
  return (data as LoyaltyCard | null) ?? null;
}

/** Visit codes: the cashier makes one (6 digits, 10 minutes, one use); the customer types it on their card. */
export async function createVisitCode(businessId: string, role: string) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db().from("loyalty_visit_codes").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", since);
  if ((count ?? 0) >= 120) throw new Error("Se crearon muchos códigos en la última hora. Espera un momento.");
  for (let i = 0; i < 5; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await db().from("loyalty_visit_codes").insert({ business_id: businessId, code, created_by: role, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    // An old code with the same digits: free it if it already expired, then retry.
    await db().from("loyalty_visit_codes").delete().eq("business_id", businessId).eq("code", code).lt("expires_at", new Date().toISOString());
  }
  throw new Error("No se pudo crear el código. Inténtalo otra vez.");
}

export async function applyVisitCode(card: LoyaltyCard, program: LoyaltyProgram, code: string) {
  const c = code.replace(/\D/g, "");
  if (!/^\d{6}$/.test(c)) throw new Error("El código de visita tiene 6 números.");
  const now = new Date().toISOString();
  // Claimed first: a code works once, for one card, before it expires.
  const { data } = await db().from("loyalty_visit_codes").update({ used_at: now, card_id: card.id })
    .eq("business_id", card.business_id).eq("code", c).is("used_at", null).gt("expires_at", now).select("id").maybeSingle();
  if (!data) throw new Error("Ese código no es válido, ya se usó o venció. Pide uno nuevo en caja.");
  try {
    return await addStamp(card, program, "cliente", "visit_code");
  } catch (e) {
    await db().from("loyalty_visit_codes").update({ used_at: null, card_id: null }).eq("id", data.id); // give it back
    throw e;
  }
}

export async function cardHistory(cardId: string): Promise<LoyaltyEvent[]> {
  const { data } = await db().from("loyalty_events").select("id, kind, by_role, method, reward_code, created_at").eq("card_id", cardId).order("created_at", { ascending: false }).limit(30);
  return (data ?? []) as LoyaltyEvent[];
}

export async function loyaltyStats(businessId: string) {
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const d90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [cardsRes, events, recent, allStamps] = await Promise.all([
    db().from("loyalty_cards").select("id, stamps, rewards, reward_code, last_stamp_at, created_at, name, code").eq("business_id", businessId).limit(20000),
    db().from("loyalty_events").select("card_id, kind, by_role, created_at").eq("business_id", businessId).gte("created_at", d90).order("created_at").limit(50000),
    db().from("loyalty_cards").select("*").eq("business_id", businessId).order("last_stamp_at", { ascending: false, nullsFirst: false }).limit(12),
    db().from("loyalty_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "stamp"),
  ]);
  const cards = (cardsRes.data ?? []) as Pick<LoyaltyCard, "id" | "stamps" | "rewards" | "reward_code" | "last_stamp_at" | "created_at" | "name" | "code">[];
  const ev = (events.data ?? []) as { card_id: string; kind: string; by_role: string | null; created_at: string }[];
  const stamps = ev.filter((e) => e.kind === "stamp");
  // How often customers come back: average days between two stamps of the same card (last 90 days).
  const byCard = new Map<string, number[]>();
  for (const e of stamps) byCard.set(e.card_id, [...(byCard.get(e.card_id) ?? []), Date.parse(e.created_at)]);
  const gaps: number[] = [];
  for (const t of byCard.values()) for (let i = 1; i < t.length; i++) gaps.push((t[i]! - t[i - 1]!) / 86_400_000);
  // Activity worth a look: one card stamped 3+ times in 24 h, or one role stamping 30+ times in one hour.
  const suspicious: { what: string; when: string }[] = [];
  for (const [id, t] of byCard) for (let i = 2; i < t.length; i++) if (t[i]! - t[i - 2]! < 86_400_000) { const c = cards.find((x) => x.id === id); suspicious.push({ what: `La tarjeta de ${c?.name ?? "un cliente"} (${c?.code ?? ""}) recibió 3 sellos en menos de 24 horas.`, when: new Date(t[i]!).toISOString() }); break; }
  const hourly = new Map<string, number>();
  for (const e of stamps) { const k = `${e.by_role ?? "?"}|${e.created_at.slice(0, 13)}`; hourly.set(k, (hourly.get(k) ?? 0) + 1); }
  for (const [k, n] of hourly) if (n >= 30) suspicious.push({ what: `${n} sellos en una hora desde un mismo acceso (${k.split("|")[0] === "owner" ? "dueño" : k.split("|")[0] === "manager" ? "gerente" : k.split("|")[0]}).`, when: `${k.split("|")[1]}:00:00Z` });
  const total = cards.length;
  return {
    cards: total,
    active: cards.filter((c) => c.last_stamp_at && c.last_stamp_at >= d30).length,
    joined30: ev.filter((e) => e.kind === "join" && e.created_at >= d30).length,
    stamps30: stamps.filter((e) => e.created_at >= d30).length,
    visits: allStamps.count ?? 0,
    pending: cards.filter((c) => c.reward_code).length,
    rewards30: ev.filter((e) => e.kind === "redeem" && e.created_at >= d30).length,
    rewardsAll: cards.reduce((n, c) => n + c.rewards, 0),
    completion: total ? Math.round((cards.filter((c) => c.rewards > 0 || c.reward_code).length / total) * 100) : 0,
    returnDays: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
    suspicious: suspicious.sort((a, z) => z.when.localeCompare(a.when)).slice(0, 10),
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
