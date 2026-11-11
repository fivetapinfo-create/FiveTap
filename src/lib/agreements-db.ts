import "server-only";
import type { Agreement } from "./agreement";
import { db } from "./supabase";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listAgreements() {
  return must(await db().from("agreements").select("*").order("created_at", { ascending: false }).limit(300)) as Agreement[];
}
export async function agreementsFor(businessId: string) {
  return must(await db().from("agreements").select("*").eq("business_id", businessId).order("created_at", { ascending: false })) as Agreement[];
}
export async function agreementById(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return must(await db().from("agreements").select("*").eq("id", id).maybeSingle()) as Agreement | null;
}
export async function agreementByToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  return must(await db().from("agreements").select("*").eq("token", token).maybeSingle()) as Agreement | null;
}
