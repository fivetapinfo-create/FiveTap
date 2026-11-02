"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePrivate, uploadPrivate } from "@/lib/company";
import { db } from "@/lib/supabase";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const opt = (f: FormData, k: string, max = 200) => str(f, k, max) || null;
const num = (f: FormData, k: string, fallback = 0) => {
  const n = Number(str(f, k).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const date = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(f, k)) ? str(f, k) : null);

const BACK = "/admin/empresa";
function done(ok: string): never {
  revalidatePath(BACK);
  redirect(`${BACK}?ok=${ok}`);
}
function fail(e: unknown): never {
  redirect(`${BACK}?error=${encodeURIComponent(e instanceof Error ? e.message : "Error inesperado")}`);
}

export async function saveCompany(f: FormData) {
  try {
    const costs = [0, 1, 2, 3, 4, 5]
      .map((i) => ({ name: str(f, `cost_name_${i}`, 40), amount: num(f, `cost_amount_${i}`) }))
      .filter((c) => c.name && c.amount > 0);
    const { error } = await db().from("company").update({
      trade_name: str(f, "trade_name", 80) || "FiveTap",
      legal_name: opt(f, "legal_name", 120),
      entity_type: opt(f, "entity_type", 60),
      registry_number: opt(f, "registry_number", 60),
      constitution_date: date(f, "constitution_date"),
      legal_address: opt(f, "legal_address", 200),
      representative_name: opt(f, "representative_name", 100),
      representative_id: opt(f, "representative_id", 40),
      representative_role: str(f, "representative_role", 60) || "Representante legal",
      option_pool_pct: Math.min(num(f, "option_pool_pct"), 100),
      monthly_costs: costs,
      paypal_fee_pct: Math.min(num(f, "paypal_fee_pct", 5.4), 20),
      paypal_fee_fixed: num(f, "paypal_fee_fixed", 0.3),
      cost_plaque: num(f, "cost_plaque", 3),
      cost_card: num(f, "cost_card", 1),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) throw new Error(error.message);
  } catch (e) {
    fail(e);
  }
  done("empresa");
}

export async function saveFounder(f: FormData) {
  try {
    const row = {
      first_name: str(f, "first_name", 60),
      last_name: str(f, "last_name", 60),
      passport: opt(f, "passport", 40),
      nationality: opt(f, "nationality", 40),
      role: str(f, "role", 60) || "Fundador y CEO",
      equity_pct: Math.min(num(f, "equity_pct", 100), 100),
      joined_on: date(f, "joined_on") ?? new Date().toISOString().slice(0, 10),
    };
    if (!row.first_name || !row.last_name) throw new Error("Nombre y apellido son obligatorios.");
    const id = str(f, "id", 60);
    const { error } = id
      ? await db().from("founders").update(row).eq("id", id)
      : await db().from("founders").insert(row);
    if (error) throw new Error(error.message);
  } catch (e) {
    fail(e);
  }
  done("fundador");
}

export async function deleteFounder(f: FormData) {
  const { error } = await db().from("founders").delete().eq("id", str(f, "id", 60));
  if (error) fail(new Error(error.message));
  done("fundador");
}

const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function uploadDocument(f: FormData) {
  try {
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Elige un archivo.");
    const ext = DOC_TYPES[file.type];
    if (!ext) throw new Error("Sube un PDF o una foto (JPG, PNG, WEBP, HEIC).");
    if (file.size > 4_000_000) throw new Error("El archivo debe pesar menos de 4 MB (toma la foto en menor calidad o comprime el PDF).");
    const kind = str(f, "kind", 30) || "otro";
    const title = str(f, "title", 120) || file.name.slice(0, 120);
    const path = await uploadPrivate(`company/${Date.now()}-${kind}.${ext}`, file, file.type);
    const { error } = await db().from("documents").insert({ kind, title, path });
    if (error) {
      await removePrivate(path);
      throw new Error(error.message);
    }
  } catch (e) {
    fail(e);
  }
  done("documento");
}

export async function deleteDocument(f: FormData) {
  const id = str(f, "id", 60);
  const { data } = await db().from("documents").select("path").eq("id", id).maybeSingle();
  if (data?.path) await removePrivate(data.path as string);
  await db().from("documents").delete().eq("id", id);
  done("documento");
}
