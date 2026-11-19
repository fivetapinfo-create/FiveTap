"use server";

import { guestClosed, tagByCode } from "@/lib/data";
import { deviceFrom } from "@/lib/device";
import { can } from "@/lib/entitlements";
import { staffMember, submitRating } from "@/lib/staff";
import { cookies, headers } from "next/headers";

export type RateState = { ok: boolean; stars?: number; duplicate?: boolean; error?: string };

/** The guest's rating of one employee. The server checks the card, the business and the person. */
export async function rateStaff(_prev: RateState, f: FormData): Promise<RateState> {
  if (String(f.get("website") || "")) return { ok: true, stars: 5 }; // honeypot
  const code = String(f.get("code") ?? "");
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag)) || !(await can(tag.business, "team"))) return { ok: false, error: "closed" };
  const ref = String(f.get("p") ?? "");
  // A waiter's own card always rates its own person; a table card rates the person picked.
  const person = tag.kind === "waiter" && tag.staff_id ? await staffMember(tag.business_id, tag.staff_id) : await staffMember(tag.business_id, ref);
  if (!person || !person.active) return { ok: false, error: "staff" };
  const stars = Number(f.get("rating"));
  if (!(stars >= 1 && stars <= 5)) return { ok: false, error: "stars" };
  // One rating per phone and person every 6 hours: remembered on the phone (mobile IPs change often).
  const jar = await cookies();
  const mark = `ft_r_${person.ref}`;
  if (jar.get(mark)) return { ok: true, stars, duplicate: true };
  try {
    const r = await submitRating({
      businessId: tag.business_id, branchId: tag.branch_id ?? person.branch_id, staffId: person.id, tagId: tag.id,
      source: tag.kind === "waiter" ? "waiter" : "table", rating: stars, comment: String(f.get("comment") ?? ""), issue: String(f.get("issue") ?? ""),
      device: deviceFrom((await headers()).get("user-agent") ?? ""), businessName: tag.business.name, staffName: person.name,
      tableLabel: tag.kind === "waiter" ? "" : tag.label, ownerToken: tag.business.owner_token,
    });
    jar.set(mark, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/t", maxAge: 6 * 3600 });
    return { ok: true, stars, duplicate: r.duplicate };
  } catch (e) {
    console.error("[atencion]", e);
    return { ok: false, error: "send" };
  }
}
