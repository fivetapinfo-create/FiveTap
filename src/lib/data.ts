import "server-only";
import { billingState, type Billing } from "./agenda";
import { db } from "./supabase";
import type { Business, BusinessStats, Contact, Feedback, Payment, Tag, TagStats } from "./types";
import type { Device } from "./device";

export type EventType = "scan" | "review_click" | "feedback_sent";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Guest side ----------

export type TagWithBusiness = Tag & { business: Business };

export async function tagByCode(code: string): Promise<TagWithBusiness | null> {
  if (!/^[a-z0-9]{4,16}$/.test(code)) return null;
  const res = await db().from("tags").select("*, business:businesses(*)").eq("code", code).maybeSingle();
  return must(res) as TagWithBusiness | null;
}

/** A venue's payments, newest first (enough to know the current period, also for annual halves). */
export async function recentPayments(businessId: string) {
  const res = await db().from("payments").select("kind, method, paid_at, amount").eq("business_id", businessId).order("paid_at", { ascending: false }).limit(24);
  return must(res) as Pick<Payment, "kind" | "method" | "paid_at" | "amount">[];
}

/** Where the venue stands with its payments: paused, canceled or unpaid past the grace days close everything. */
export async function billingOf(b: Business): Promise<Billing> {
  return billingState(b, await recentPayments(b.id));
}

/** The plaque's pages (tap, message, club, Google) are closed: plaque off, venue paused, canceled or unpaid. */
export async function guestClosed(tag: TagWithBusiness | null): Promise<boolean> {
  if (!tag || !tag.active) return true;
  return (await billingOf(tag.business)).blocked;
}

export async function logEvent(e: {
  business_id: string;
  tag_id: string;
  type: EventType;
  source: "nfc" | "qr" | null;
  device: Device;
  user_agent: string;
}) {
  const { error } = await db().from("events").insert({ ...e, user_agent: e.user_agent.slice(0, 300) });
  if (error) console.error("[events]", error.message);
}

export async function insertFeedback(f: { business_id: string; tag_id: string; name: string | null; message: string; phone: string | null }) {
  return must(await db().from("feedback").insert(f).select("id").single()) as { id: string };
}

export async function markNotified(id: string, via: string[]) {
  if (via.length) await db().from("feedback").update({ notified_via: via }).eq("id", id);
}

/** Adds a guest to the venue's club. Joining twice with the same phone just updates the row. */
export async function upsertContact(c: {
  business_id: string;
  tag_id: string;
  name: string;
  phone: string;
  birthday_month: number | null;
  birthday_day: number | null;
}) {
  const { error } = await db()
    .from("contacts")
    .upsert({ ...c, consent_at: new Date().toISOString() }, { onConflict: "business_id,phone" });
  if (error) throw new Error(error.message);
}

/** Messages from one tag in the last few minutes; used to stop email floods. */
export async function recentFeedbackCount(tagId: string, minutes = 10): Promise<number> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count } = await db().from("feedback").select("id", { count: "exact", head: true }).eq("tag_id", tagId).gte("created_at", since);
  return count ?? 0;
}

// ---------- Internal panel ----------

export async function unreadCount(): Promise<number> {
  const { count } = await db().from("feedback").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export type InboxItem = Feedback & { business: Pick<Business, "id" | "name" | "logo_url" | "brand_color" | "manager_phone">; tag: Pick<Tag, "label"> | null };

export async function inbox(limit = 100): Promise<InboxItem[]> {
  const res = await db()
    .from("feedback")
    .select("*, business:businesses(id, name, logo_url, brand_color, manager_phone), tag:tags(label)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return must(res) as InboxItem[];
}

/** Marks messages as read. Called after the page that shows them has rendered. */
export async function markRead(filter: { businessId?: string; ids?: string[] }) {
  let q = db().from("feedback").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (filter.businessId) q = q.eq("business_id", filter.businessId);
  if (filter.ids) {
    if (!filter.ids.length) return;
    q = q.in("id", filter.ids);
  }
  const { error } = await q;
  if (error) console.error("[markRead]", error.message);
}

export async function listBusinesses() {
  const [businesses, stats] = await Promise.all([
    db().from("businesses").select("*").order("created_at", { ascending: false }),
    db().from("business_stats").select("*"),
  ]);
  const byId = new Map((must(stats) as BusinessStats[]).map((s) => [s.business_id, s]));
  return (must(businesses) as Business[]).map((b) => ({ business: b, stats: byId.get(b.id) ?? null }));
}

// ---------- Monthly report ----------

export type ReportPeriod = {
  key: "prev" | "this";
  label: string; // "octubre 2026"
  scans: number;
  nfc: number;
  qr: number;
  reviews: number;
  feedback: number;
  club: number;
  top: { label: string; scans: number } | null;
};

const PANAMA_OFFSET_H = 5; // Panamá is UTC-5 all year (no DST).

/** First instant of a calendar month in Panamá time, as a UTC Date. */
function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1, PANAMA_OFFSET_H));
}

/** Last calendar month and the month so far, counted in Panamá time. One database call. */
export async function monthlyReport(businessId: string, tags: Tag[]): Promise<ReportPeriod[]> {
  return (await reportData(businessId, tags)).periods;
}

/** The monthly report plus clients sent to Google since the first review count (or ever). */
export async function reportData(businessId: string, tagList: Tag[] | Promise<Tag[]> = []): Promise<{ periods: ReportPeriod[]; sinceReviews: number }> {
  const now = new Date(Date.now() - PANAMA_OFFSET_H * 3600_000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const prevFrom = monthStart(y, m - 1);
  const thisFrom = monthStart(y, m);
  // Tags may still be loading elsewhere: wait for both at once.
  const [res, tags] = await Promise.all([
    db().rpc("business_report", { p_business: businessId, p_prev: prevFrom.toISOString(), p_this: thisFrom.toISOString(), p_now: new Date().toISOString() }),
    tagList,
  ]);
  const rows = must(res) as { period: "prev" | "this" | "since"; type: string; source: string | null; tag_id: string | null; n: number }[];

  const sum = (period: string, f: (r: (typeof rows)[number]) => boolean) =>
    rows.filter((r) => r.period === period && f(r)).reduce((a, r) => a + Number(r.n), 0);
  const label = (from: Date) =>
    new Intl.DateTimeFormat("es-PA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(from.getTime() - PANAMA_OFFSET_H * 3600_000));

  const periods = ([["prev", prevFrom], ["this", thisFrom]] as const).map(([key, from]) => {
    const scans = sum(key, (r) => r.type === "scan");
    const nfc = sum(key, (r) => r.type === "scan" && r.source === "nfc");
    const top = tags
      .map((t) => ({ label: t.label, scans: sum(key, (r) => r.type === "scan" && r.tag_id === t.id) }))
      .reduce<{ label: string; scans: number } | null>((a, t) => (t.scans > (a?.scans ?? 0) ? t : a), null);
    return {
      key,
      label: label(from),
      scans,
      nfc,
      qr: scans - nfc,
      reviews: sum(key, (r) => r.type === "review_click"),
      feedback: sum(key, (r) => r.type === "feedback_sent"),
      club: sum(key, (r) => r.type === "club"),
      top,
    };
  });
  return { periods, sinceReviews: sum("since", () => true) };
}

export async function contactsFor(businessId: string) {
  const res = await db().from("contacts").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
  return must(res) as Contact[];
}

export async function deleteContact(id: string) {
  const { error } = await db().from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** The owner's private summary page is reached by an unguessable token, no login. */
export async function businessByOwnerToken(token: string): Promise<Business | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const res = await db().from("businesses").select("*").eq("owner_token", token).maybeSingle();
  return must(res) as Business | null;
}

/** A venue with its placas, stats, messages and payments, in one round trip. */
export async function businessDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [one, tagsRes, stats, feedback, payments, tagStatsRes] = await Promise.all([
    db().from("businesses").select("*").eq("id", id).maybeSingle(),
    db().from("tags").select("*").eq("business_id", id).order("created_at"),
    db().from("business_stats").select("*").eq("business_id", id).maybeSingle(),
    db().from("feedback").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(50),
    db().from("payments").select("*").eq("business_id", id).order("paid_at", { ascending: false }),
    db().from("tag_stats").select("*").eq("business_id", id),
  ]);
  const business = must(one) as Business | null;
  if (!business) return null;
  const tagStats = must(tagStatsRes) as TagStats[];
  return {
    business,
    tags: must(tagsRes) as Tag[],
    stats: must(stats) as BusinessStats | null,
    tagStats: new Map(tagStats.map((s) => [s.tag_id, s])),
    feedback: must(feedback) as Feedback[],
    payments: must(payments) as Payment[],
  };
}

// ---------- Google reviews, counted by hand ----------

export type ReviewSnapshot = { id: string; business_id: string; taken_on: string; reviews: number; rating: number | null };

/** Oldest first: the first one is the count before FiveTap. */
export async function reviewSnapshots(businessId: string) {
  const res = await db().from("review_snapshots").select("id, business_id, taken_on, reviews, rating").eq("business_id", businessId).order("taken_on").order("created_at");
  return (must(res) as ReviewSnapshot[]).map((s) => ({ ...s, rating: s.rating === null ? null : Number(s.rating) }));
}

export async function addReviewSnapshot(s: { business_id: string; taken_on: string; reviews: number; rating: number | null }) {
  const { error } = await db().from("review_snapshots").insert(s);
  if (error) throw new Error(error.message);
}

export async function deleteReviewSnapshot(id: string) {
  const { error } = await db().from("review_snapshots").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
