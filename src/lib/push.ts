import "server-only";
import webpush from "web-push";
import { SITE_URL } from "./site";
import { db } from "./supabase";

// Phone notifications through the FiveTap app (a PWA installed from the browser).
// Web Push is free: Apple and Google deliver them, no paid API in between.

export type PushRole = "founder" | "owner" | "manager";
export type PushMessage = { title: string; body: string; url: string; tag?: string };
export type PushTarget = { role: PushRole | PushRole[]; businessId?: string };

let configured: boolean | null = null;

export function pushReady() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  const subject = process.env.VAPID_SUBJECT || (SITE_URL.startsWith("https://") ? SITE_URL : "mailto:fivetap@example.com");
  webpush.setVapidDetails(subject, pub, priv);
  return (configured = true);
}

export type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

export function parseSubscription(v: unknown): SubscriptionInput | null {
  const s = v as SubscriptionInput | null;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 1000) return null;
  if (typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") return null;
  return s;
}

/** Saves this phone. The same phone subscribing again just updates its role. */
export async function saveSubscription(s: SubscriptionInput, role: PushRole, businessId: string | null) {
  const { error } = await db()
    .from("push_subscriptions")
    .upsert({ endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, role, business_id: businessId }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
}

export async function removeSubscription(endpoint: string) {
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function countSubscriptions(target: PushTarget) {
  let q = db().from("push_subscriptions").select("id", { count: "exact", head: true }).in("role", ([] as PushRole[]).concat(target.role));
  if (target.businessId) q = q.eq("business_id", target.businessId);
  const { count } = await q;
  return count ?? 0;
}

async function deliver(s: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "normal" });
    return 1;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await removeSubscription(s.endpoint);
    else console.error("[push]", status, (e as Error).message);
    return 0;
  }
}

/** Venue phones show the white icon, the founder's the black one. */
const payloadOf = (msg: PushMessage, venue = msg.url.startsWith("/mi/")) =>
  JSON.stringify({ ...msg, icon: venue ? "/icon-owner-192.png" : "/icon-192.png", badge: "/badge-96.png" });

/** The "it works" notification right after a phone turns them on. */
export async function sendWelcome(s: SubscriptionInput, msg: PushMessage) {
  if (!pushReady()) return 0;
  return deliver({ endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }, payloadOf(msg));
}

/** Sends to every matching phone. Phones that uninstalled the app are forgotten. Returns how many got it. */
export async function sendPush(target: PushTarget, msg: PushMessage): Promise<number> {
  if (!pushReady()) return 0;
  let q = db().from("push_subscriptions").select("endpoint, p256dh, auth").in("role", ([] as PushRole[]).concat(target.role));
  if (target.businessId) q = q.eq("business_id", target.businessId);
  const { data, error } = await q;
  if (error) {
    console.error("[push]", error.message);
    return 0;
  }
  const payload = payloadOf(msg);
  const results = await Promise.all((data ?? []).map((sub) => deliver(sub, payload)));
  return results.reduce<number>((a, n) => a + n, 0);
}

/** Sends once per key, ever: a repeated cron run can't notify twice. */
export async function sendPushOnce(key: string, target: PushTarget, msg: PushMessage) {
  const { error } = await db().from("push_log").insert({ key });
  if (error) return 0; // Already sent (duplicate key) or the log is unavailable.
  return sendPush(target, msg);
}
