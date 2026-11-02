"use server";

import { redirect } from "next/navigation";
import { tagByCode, upsertContact } from "@/lib/data";
import { normalizePhone } from "@/lib/phone";

const int = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function joinClub(formData: FormData) {
  const code = String(formData.get("code") || "");
  const q = formData.get("s") === "q" ? "?s=q&" : "?";
  const base = `/t/${code}/club${q}`;

  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") || "")) redirect(`${base}listo=1`);

  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (!name || !phone) redirect(`${base}error=telefono`);
  if (formData.get("consent") !== "1") redirect(`${base}error=consentimiento`);

  const tag = await tagByCode(code);
  if (!tag || !tag.active) redirect(`/t/${code}`);

  const month = int(formData.get("month"), 1, 12);
  const day = month ? int(formData.get("day"), 1, 31) : null;
  try {
    await upsertContact({
      business_id: tag.business_id,
      tag_id: tag.id,
      name,
      phone,
      birthday_month: day ? month : null,
      birthday_day: day,
    });
  } catch (e) {
    console.error("[club]", e);
    redirect(`${base}error=envio`);
  }
  redirect(`${base}listo=1`);
}
