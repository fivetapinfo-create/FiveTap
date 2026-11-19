"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, unlock } from "@/lib/access";
import { can } from "@/lib/entitlements";
import { addStamp, allowStamping, cardByToken, programFor, redeemReward, stampRole } from "@/lib/loyalty-cards";

const back = (token: string, q: string) => redirect(`/tarjeta/${token}/sellar?${q}`);

/** A staff phone proves it belongs to the business (its access code, or username and password) once. */
export async function authorizeStamping(f: FormData) {
  const token = String(f.get("token") ?? "");
  const card = await cardByToken(token);
  if (!card) redirect("/");
  const b = card.business;
  let role: string | null = null;
  if (b.password_required) {
    const r = await loginWithPassword(b, String(f.get("username") ?? ""), String(f.get("password") ?? ""));
    if (r.ok) role = r.role;
    else back(token, `error=${encodeURIComponent(r.locked ? "Demasiados intentos. Espera 15 minutos." : "Usuario o contraseña incorrectos.")}`);
  } else {
    const r = await unlock(b, String(f.get("code") ?? "").replace(/\D/g, ""));
    if (r.ok) role = r.role;
    else back(token, `error=${encodeURIComponent(r.locked ? `Demasiados intentos. Espera ${r.minutes ?? 15} minutos.` : "Código incorrecto.")}`);
  }
  await allowStamping(b, role!);
  back(token, "ok=listo");
}

export async function stampCard(f: FormData) {
  const token = String(f.get("token") ?? "");
  const op = String(f.get("op") ?? "stamp");
  const card = await cardByToken(token);
  if (!card) redirect("/");
  const role = await stampRole(card.business);
  if (!role) back(token, "");
  if (!(await can(card.business, "loyalty"))) back(token, `error=${encodeURIComponent("La tarjeta de fidelidad no está incluida en el plan de este negocio.")}`);
  const program = await programFor(card.business_id);
  let q = "";
  try {
    if (op === "redeem") { await redeemReward(card, program, role!); q = "ok=canjeado"; }
    else { const r = await addStamp(card, program, role!, "qr"); q = r.complete ? "ok=completa" : "ok=sello"; }
  } catch (e) {
    q = `error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo completar.")}`;
  }
  back(token, q);
}
