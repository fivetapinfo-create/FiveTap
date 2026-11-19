"use server";

import { redirect } from "next/navigation";
import { CARD_TOKEN_RE, cardByToken, programFor, applyVisitCode } from "@/lib/loyalty-cards";
import { db } from "@/lib/supabase";

/** The customer deletes their card and the data kept for it (name, WhatsApp, stamps). */
export async function deleteMyCard(f: FormData) {
  const token = String(f.get("token") ?? "");
  if (!CARD_TOKEN_RE.test(token) || f.get("confirm") !== "1") redirect(`/tarjeta/${token}`);
  await db().from("loyalty_cards").delete().eq("token", token);
  redirect("/tarjeta/borrada");
}

/** The customer types the visit code the cashier gave them: one verified visit. */
export async function enterVisitCode(f: FormData) {
  const token = String(f.get("token") ?? "");
  const card = await cardByToken(token);
  if (!card) redirect("/");
  let q = "";
  try {
    const r = await applyVisitCode(card, await programFor(card.business_id), String(f.get("code") ?? ""));
    q = r.complete ? "sello=premio" : "sello=1";
  } catch (e) {
    q = `error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo validar.")}`;
  }
  redirect(`/tarjeta/${token}?${q}`);
}
