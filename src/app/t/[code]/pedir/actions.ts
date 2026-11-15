"use server";

import { redirect } from "next/navigation";
import { guestClosed, tagByCode } from "@/lib/data";
import { moduleOn, placeOrder } from "@/lib/orders";

/** A guest sends their order from the plaque. Prices are checked on the server. */
export async function sendOrder(f: FormData) {
  const code = String(f.get("code") ?? "");
  const back = `/t/${code}/pedir`;
  if (String(f.get("website") ?? "")) redirect(back); // bots
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag)) || !moduleOn(tag.business, "orders")) redirect(`/t/${code}`);
  const name = String(f.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!name) redirect(`${back}?error=nombre`);
  const where = String(f.get("where") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  // A table plaque says where the guest is; from a team card the guest writes it.
  const label = tag.kind === "waiter" ? where : tag.label;
  if (!label) redirect(`${back}?error=donde`);
  let lines: { id: string; qty: number }[] = [];
  try {
    lines = (JSON.parse(String(f.get("lines") ?? "[]")) as { id: string; qty: number }[]).map((l) => ({ id: String(l.id), qty: Math.round(Number(l.qty)) }));
  } catch {
    redirect(`${back}?error=vacio`);
  }
  const peopleRaw = Number(f.get("people") ?? 0);
  const people = Number.isInteger(peopleRaw) && peopleRaw >= 1 && peopleRaw <= 99 ? peopleRaw : null;
  const notes = String(f.get("notes") ?? "").trim().slice(0, 400) || null;
  let token = "";
  try {
    token = (await placeOrder({ id: tag.id, label, business_id: tag.business_id }, { lines, name, people, notes })).token;
  } catch (e) {
    redirect(`${back}?error=${e instanceof Error && e.message === "empty" ? "vacio" : "envio"}`);
  }
  redirect(`/t/${code}/pedido/${token}`);
}
