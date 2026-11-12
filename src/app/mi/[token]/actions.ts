"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessRole, renewCode, unlock } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { db } from "@/lib/supabase";

/** The owner or manager closes a private message once it is handled (or opens it again). */
export async function setMessageResolved(f: FormData) {
  const token = String(f.get("token") ?? "");
  const id = String(f.get("feedback_id") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || !/^[0-9a-f-]{36}$/i.test(id) || !(await accessRole(b))) return;
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

/** Checks the access code and remembers it on this phone (as owner or manager). */
export async function unlockAccess(f: FormData) {
  const token = String(f.get("token") ?? "");
  const code = String(f.get("code") ?? "").replace(/\D/g, "");
  const b = await businessByOwnerToken(token);
  if (!b) redirect("/");
  const r = await unlock(b, code);
  if (r.ok) redirect(`/mi/${token}?rol=${r.role === "manager" ? "gerente" : "dueno"}${f.get("instalar") === "1" ? "&instalar=1" : ""}`);
  await new Promise((res) => setTimeout(res, 1000));
  redirect(`/mi/${token}?acceso=${r.locked ? "bloqueado" : "mal"}${f.get("instalar") === "1" ? "&instalar=1" : ""}`);
}

/** The owner gives the manager a new code (e.g. the manager left). Only the owner can. */
export async function renewManagerCode(f: FormData) {
  const token = String(f.get("token") ?? "");
  const b = await businessByOwnerToken(token);
  if (!b || (await accessRole(b)) !== "owner") redirect("/");
  await renewCode(b, "manager");
  redirect(`/mi/${token}/ajustes?ok=codigo#acceso`);
}
