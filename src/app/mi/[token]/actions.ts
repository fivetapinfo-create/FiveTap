"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PIN_RE, hashPin, pinMatches, pinUnlocked, rememberPin } from "@/lib/owner-pin";
import { businessByOwnerToken } from "@/lib/data";
import { db } from "@/lib/supabase";

/** The owner or manager closes a private message once it is handled (or opens it again). */
export async function setMessageResolved(f: FormData) {
  const token = String(f.get("token") ?? "");
  const id = String(f.get("feedback_id") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !/^[0-9a-f-]{36}$/i.test(id) || !(await pinUnlocked(b))) return;
  const now = new Date().toISOString();
  const resolved = f.get("resolved") === "1";
  const { error } = await db()
    .from("feedback")
    .update(resolved ? { resolved_at: now, read_at: now } : { resolved_at: null })
    .eq("id", id)
    .eq("business_id", b.id);
  if (error) console.error("[setMessageResolved]", error.message);
  revalidatePath(`/mi/${token}`);
}

/** Checks the PIN and remembers it on this phone. A short pause slows down guessing. */
export async function unlockPin(f: FormData) {
  const token = String(f.get("token") ?? "");
  const pin = String(f.get("pin") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b) redirect("/");
  if (!b.owner_pin_hash || pinMatches(pin, b.owner_pin_hash)) {
    await rememberPin(b);
    redirect(`/mi/${token}`);
  }
  await new Promise((r) => setTimeout(r, 1200));
  redirect(`/mi/${token}?pin=mal`);
}

/** Sets, changes or removes the app's PIN from Configuración (only reachable once unlocked). */
export async function savePin(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !(await pinUnlocked(b))) redirect("/");
  const back = `/mi/${token}/ajustes`;
  if (f.get("remove") === "1") {
    await db().from("businesses").update({ owner_pin_hash: null }).eq("id", b.id);
    redirect(`${back}?ok=pin-quitado#pin`);
  }
  const pin = String(f.get("pin") ?? "");
  if (!PIN_RE.test(pin)) redirect(`${back}?error=pin#pin`);
  const owner_pin_hash = hashPin(pin);
  const { error } = await db().from("businesses").update({ owner_pin_hash }).eq("id", b.id);
  if (error) redirect(`${back}?error=guardar#pin`);
  await rememberPin({ ...b, owner_pin_hash });
  redirect(`${back}?ok=pin#pin`);
}
