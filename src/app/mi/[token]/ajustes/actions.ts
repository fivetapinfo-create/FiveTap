"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CANCEL_REASONS } from "@/lib/cancel";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { sendPush } from "@/lib/push";
import { db } from "@/lib/supabase";

/** The owner asks to cancel from their app. Nothing is charged after the paid period; the founder is told at once. */
export async function requestCancel(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || (await accessRole(b)) !== "owner") redirect("/");
  const back = `/mi/${token}/ajustes`;
  const reason = String(f.get("reason") ?? "");
  const detail = String(f.get("detail") ?? "").trim().slice(0, 300);
  if (!CANCEL_REASONS.includes(reason as (typeof CANCEL_REASONS)[number])) redirect(`${back}?error=motivo#suscripcion`);
  const text = detail ? `${reason}: ${detail}` : reason;
  const { error } = await db().from("businesses").update({ cancel_requested_at: new Date().toISOString(), cancel_reason: text }).eq("id", b.id);
  if (error) redirect(`${back}?error=guardar#suscripcion`);
  await sendPush({ role: "founder" }, { title: `${b.name} pidió cancelar`, body: text, url: `/admin/b/${b.id}` });
  revalidatePath(back);
  redirect(`${back}?ok=cancelado#suscripcion`);
}

/** Changed their mind: the plan continues as before. */
export async function undoCancel(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || (await accessRole(b)) !== "owner") redirect("/");
  await db().from("businesses").update({ cancel_requested_at: null, cancel_reason: null }).eq("id", b.id);
  await sendPush({ role: "founder" }, { title: `${b.name} sigue con FiveTap 🎉`, body: "Retiró su solicitud de cancelación.", url: `/admin/b/${b.id}` });
  revalidatePath(`/mi/${token}/ajustes`);
  redirect(`/mi/${token}/ajustes?ok=sigue#suscripcion`);
}
