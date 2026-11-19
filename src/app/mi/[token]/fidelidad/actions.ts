"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { addStamp, cardByCode, cardByRewardCode, createVisitCode, programFor, redeemReward, saveProgram } from "@/lib/loyalty-cards";

async function ctx(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  const role = b ? await accessRole(b) : null;
  if (!b || !role) redirect("/");
  const back = `/mi/${token}/fidelidad`;
  if (!(await can(b, "loyalty"))) redirect(back);
  return { b, role, back };
}

/** The owner turns the card on and decides how many stamps and which reward. */
export async function saveLoyaltyProgram(f: FormData) {
  const { b, role, back } = await ctx(f);
  if (role !== "owner") redirect(`${back}?error=${encodeURIComponent("Solo el dueño cambia el premio.")}`);
  let error = "";
  try {
    await saveProgram(b.id, {
      enabled: f.get("enabled") === "1",
      stamps_needed: Number(f.get("stamps_needed") ?? 8),
      reward: String(f.get("reward") ?? ""),
      cooldown_hours: Number(f.get("cooldown_hours") ?? 3),
      name: String(f.get("name") ?? ""),
      terms: String(f.get("terms") ?? ""),
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo guardar.";
  }
  revalidatePath(back);
  redirect(error ? `${back}?error=${encodeURIComponent(error)}#premio` : `${back}?ok=guardado#premio`);
}

/** Stamps (or redeems) a card by the code the customer shows, from inside the app. */
export async function stampByCode(f: FormData) {
  const { b, role, back } = await ctx(f);
  const code = String(f.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const op = String(f.get("op") ?? "find");
  // A reward code (R + 6) finds the card whose reward is waiting; otherwise the card's own code.
  const card = code.startsWith("R") && code.length === 7 ? await cardByRewardCode(b.id, code) : await cardByCode(b.id, code);
  if (!card) redirect(`${back}?error=${encodeURIComponent("No encontramos una tarjeta con ese código. Revísalo con el cliente.")}#sellar`);
  if (op === "find") redirect(`${back}?c=${card.code}#sellar`);
  const program = await programFor(b.id);
  let q = "";
  try {
    if (op === "redeem") { await redeemReward(card, program, role); q = "ok=canjeado"; }
    else { const r = await addStamp(card, program, role, "app"); q = r.complete ? "ok=completa" : "ok=sello"; }
  } catch (e) {
    q = `error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo completar.")}`;
  }
  revalidatePath(back);
  redirect(`${back}?c=${card.code}&${q}#sellar`);
}

/** The cashier makes a one-time visit code (6 digits, valid 10 minutes) for a customer to type on their card. */
export async function makeVisitCode(f: FormData) {
  const { b, role, back } = await ctx(f);
  let q = "";
  try { q = `vc=${await createVisitCode(b.id, role)}`; } catch (e) { q = `error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo crear.")}`; }
  redirect(`${back}?${q}#codigo`);
}
