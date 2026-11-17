"use server";

import { redirect } from "next/navigation";
import { CARD_TOKEN_RE } from "@/lib/loyalty-cards";
import { db } from "@/lib/supabase";

/** The customer deletes their card and the data kept for it (name, WhatsApp, stamps). */
export async function deleteMyCard(f: FormData) {
  const token = String(f.get("token") ?? "");
  if (!CARD_TOKEN_RE.test(token) || f.get("confirm") !== "1") redirect(`/tarjeta/${token}`);
  await db().from("loyalty_cards").delete().eq("token", token);
  redirect("/tarjeta/borrada");
}
