// Team ranking: each waiter card counts the guests who tapped it and the ones who went on
// to Google from it. Google does not say which review came from which card, so "a Google"
// means a guest opened the review window from that card, never a confirmed review.

import { todayPanama } from "./agenda";
import { db } from "./supabase";
import type { Tag } from "./types";

export const TEAM_PERIODS = [
  { key: "hoy", label: "Hoy" },
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
] as const;
export type TeamPeriod = (typeof TEAM_PERIODS)[number]["key"];
export const teamPeriod = (v: string | undefined): TeamPeriod => (TEAM_PERIODS.some((p) => p.key === v) ? (v as TeamPeriod) : "30");

const WAITER = /meser|camarer|tarjeta|barra|bartender|staff|personal/i;
/** Waiter cards say what they are; older pieces without a kind are told apart by their name. */
export const isWaiterTag = (t: Pick<Tag, "kind" | "label">) => t.kind === "waiter" || (!t.kind && WAITER.test(t.label));

export type TeamRow = {
  id: string;
  /** The person who carries the card, or the card's name when nobody was assigned. */
  name: string;
  card: string;
  assigned: boolean;
  scans: number;
  google: number;
  messages: number;
  stars: number | null;
  rated: number;
  /** When the current person started with the card, if it changed hands inside the period. */
  since: string | null;
};

/** Start of the period: midnight in Panamá for "Hoy", otherwise the last 7 or 30 days. */
function periodStart(p: TeamPeriod) {
  if (p === "hoy") return new Date(`${todayPanama()}T05:00:00Z`);
  return new Date(Date.now() - Number(p) * 86_400_000);
}

/**
 * Ranking of the waiter cards in use for a period: most guests sent to Google first, then
 * most taps. A card handed to another person only counts from the day it changed hands.
 */
export async function teamRanking(tags: Tag[], period: TeamPeriod): Promise<TeamRow[]> {
  const cards = tags.filter((t) => t.active && t.status !== "retired" && isWaiterTag(t));
  if (!cards.length) return [];
  const start = periodStart(period);
  const ids = cards.map((t) => t.id);
  const [ev, fb] = await Promise.all([
    db().from("events").select("tag_id, type, created_at").in("tag_id", ids).in("type", ["scan", "review_click"]).gte("created_at", start.toISOString()).limit(20000),
    db().from("feedback").select("tag_id, rating, created_at").in("tag_id", ids).gte("created_at", start.toISOString()).limit(5000),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  if (fb.error) throw new Error(fb.error.message);
  const events = (ev.data ?? []) as { tag_id: string; type: string; created_at: string }[];
  const feedback = (fb.data ?? []) as { tag_id: string; rating: number | null; created_at: string }[];

  return cards
    .map((t) => {
      const from = t.staff_since && Date.parse(t.staff_since) > start.getTime() ? Date.parse(t.staff_since) : start.getTime();
      const mine = events.filter((e) => e.tag_id === t.id && Date.parse(e.created_at) >= from);
      const notes = feedback.filter((f) => f.tag_id === t.id && Date.parse(f.created_at) >= from);
      const rated = notes.filter((f) => f.rating);
      return {
        id: t.id,
        name: t.staff_name || t.label,
        card: t.label,
        assigned: Boolean(t.staff_name),
        scans: mine.filter((e) => e.type === "scan").length,
        google: mine.filter((e) => e.type === "review_click").length,
        messages: notes.length,
        stars: rated.length ? Math.round((rated.reduce((n, f) => n + Number(f.rating), 0) / rated.length) * 10) / 10 : null,
        rated: rated.length,
        since: from > start.getTime() ? new Date(from).toISOString() : null,
      };
    })
    .sort((a, z) => z.google - a.google || z.scans - a.scans || a.card.localeCompare(z.card, "es", { numeric: true }));
}

/**
 * Writes who carries a waiter card. Renaming keeps the card's history; when another person
 * takes the card (newPerson) their count starts now. Only cards of this business.
 */
export async function saveStaff(o: { tagId: string; businessId: string; name: string; label?: string; newPerson: boolean }) {
  const { data: t, error } = await db().from("tags").select("id, business_id, kind, label, staff_name").eq("id", o.tagId).eq("business_id", o.businessId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!t || !isWaiterTag(t as Pick<Tag, "kind" | "label">)) throw new Error("Esa tarjeta no es de este negocio.");
  const name = o.name.replace(/\s+/g, " ").trim().slice(0, 60) || null;
  const patch: Record<string, string | null> = { staff_name: name };
  if (o.label) patch.label = o.label.replace(/\s+/g, " ").trim().slice(0, 40);
  if (o.newPerson && t.staff_name) patch.staff_since = new Date().toISOString();
  const up = await db().from("tags").update(patch).eq("id", t.id);
  if (up.error) throw new Error(up.error.message);
  return { before: (t.staff_name as string | null) ?? null, after: name };
}
