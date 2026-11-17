"use server";

import { redirect } from "next/navigation";
import { can } from "@/lib/entitlements";
import { guestClosed, tagByCode, upsertContact } from "@/lib/data";
import { joinCard, programFor } from "@/lib/loyalty-cards";
import { normalizePhone } from "@/lib/phone";

/** The guest creates (or gets back) their loyalty card for this venue. */
export async function joinLoyalty(f: FormData) {
  const code = String(f.get("code") || "");
  const base = `/t/${code}/tarjeta?`;
  // Honeypot: real people never see or fill this field.
  if (String(f.get("website") || "")) redirect(`/t/${code}`);
  const name = String(f.get("name") || "").trim().slice(0, 80);
  const phone = normalizePhone(String(f.get("phone") || ""));
  if (!name || !phone) redirect(`${base}error=telefono`);
  if (f.get("consent") !== "1") redirect(`${base}error=consentimiento`);

  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag)) || !(await can(tag.business, "loyalty"))) redirect(`/t/${code}`);
  const program = await programFor(tag.business_id);
  if (!program.enabled) redirect(`/t/${code}`);

  let token = "";
  try {
    const card = await joinCard(tag.business_id, name, phone);
    token = card.token;
    // Promotions only with their own, separate yes (and only where the venue has the club).
    if (f.get("marketing") === "1" && (await can(tag.business, "club"))) {
      await upsertContact({ business_id: tag.business_id, tag_id: tag.id, name, phone, birthday_month: null, birthday_day: null }).catch(() => {});
    }
  } catch (e) {
    console.error("[tarjeta]", e);
    redirect(`${base}error=envio`);
  }
  redirect(`/tarjeta/${token}?nueva=1`);
}
