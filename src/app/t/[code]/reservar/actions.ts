"use server";

import { redirect } from "next/navigation";
import { guestClosed, tagByCode } from "@/lib/data";
import { moduleOn } from "@/lib/orders";
import { requestReservation } from "@/lib/reservations";

/** A guest requests a reservation from the plaque. Checked against the venue's hours on the server. */
export async function sendReservation(f: FormData) {
  const code = String(f.get("code") ?? "");
  const lang = f.get("lang") === "en" ? "en" : "es";
  const back = `/t/${code}/reservar`;
  if (String(f.get("website") ?? "")) redirect(back);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag)) || !moduleOn(tag.business, "reservations")) redirect(`/t/${code}`);
  const clean = (k: string, max: number) => String(f.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  let token = "";
  try {
    token = await requestReservation(
      { id: tag.id, business_id: tag.business_id, label: tag.label },
      { name: clean("name", 80), phone: clean("phone", 30) || null, party: Number(f.get("party")), date: clean("date", 10), time: clean("time", 5), country: clean("country", 40) || null, notes: String(f.get("notes") ?? "").trim().slice(0, 400) || null },
    );
  } catch (e) {
    const key = e instanceof Error && /^[a-z]+$/.test(e.message) ? e.message : "envio";
    redirect(`${back}?error=${key}`);
  }
  redirect(`/t/${code}/reserva/${token}?l=${lang}`);
}
