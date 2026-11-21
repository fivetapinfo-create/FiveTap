import "server-only";
import { db } from "./supabase";

export type BranchRow = { id: string | null; name: string; active: boolean; pieces: number; taps: number; google: number; ratings: number; avg: number | null; messages: number };

/**
 * One row per branch (plus pieces with no branch) and a total, over the last `days` days:
 * pieces, taps, clicks to Google, waiter ratings and private messages. This is what lets a
 * chain compare its locations and still see the whole business at once.
 */
export async function branchStats(businessId: string, days = 30): Promise<{ rows: BranchRow[]; total: BranchRow }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [br, tg, ev, rt, fb] = await Promise.all([
    db().from("branches").select("id, name, active").eq("business_id", businessId).order("sort").order("created_at"),
    db().from("tags").select("id, branch_id").eq("business_id", businessId),
    db().from("events").select("tag_id, type").eq("business_id", businessId).gte("created_at", since).limit(50000),
    db().from("service_ratings").select("branch_id, tag_id, rating").eq("business_id", businessId).gte("created_at", since).limit(50000),
    db().from("feedback").select("tag_id").eq("business_id", businessId).gte("created_at", since).limit(50000),
  ]);
  const branches = (br.data ?? []) as { id: string; name: string; active: boolean }[];
  const tagBranch = new Map(((tg.data ?? []) as { id: string; branch_id: string | null }[]).map((t) => [t.id, t.branch_id]));
  const blank = (id: string | null, name: string, active = true): BranchRow & { sum: number } => ({ id, name, active, pieces: 0, taps: 0, google: 0, ratings: 0, avg: null, messages: 0, sum: 0 });
  const rows = new Map<string, BranchRow & { sum: number }>(branches.map((b) => [b.id, blank(b.id, b.name, b.active)]));
  const none = blank(null, "Sin sucursal asignada");
  const at = (branchId: string | null | undefined) => (branchId && rows.get(branchId)) || none;
  for (const [, b] of tagBranch) at(b).pieces++;
  for (const e of (ev.data ?? []) as { tag_id: string | null; type: string }[]) {
    const r = at(e.tag_id ? tagBranch.get(e.tag_id) : null);
    if (e.type === "scan") r.taps++;
    else if (e.type === "review_click") r.google++;
  }
  for (const x of (rt.data ?? []) as { branch_id: string | null; tag_id: string | null; rating: number }[]) {
    const r = at(x.branch_id ?? (x.tag_id ? tagBranch.get(x.tag_id) : null));
    r.ratings++; r.sum += Number(x.rating) || 0;
  }
  for (const m of (fb.data ?? []) as { tag_id: string | null }[]) at(m.tag_id ? tagBranch.get(m.tag_id) : null).messages++;
  const list = [...rows.values(), ...(none.pieces || none.taps || none.ratings || none.messages ? [none] : [])];
  const total = list.reduce((t, r) => ({ ...t, pieces: t.pieces + r.pieces, taps: t.taps + r.taps, google: t.google + r.google, ratings: t.ratings + r.ratings, sum: t.sum + r.sum, messages: t.messages + r.messages }), blank(null, "Total del negocio"));
  const fin = (r: BranchRow & { sum: number }): BranchRow => ({ id: r.id, name: r.name, active: r.active, pieces: r.pieces, taps: r.taps, google: r.google, ratings: r.ratings, avg: r.ratings ? Math.round((r.sum / r.ratings) * 10) / 10 : null, messages: r.messages });
  return { rows: list.map(fin), total: fin(total) };
}
