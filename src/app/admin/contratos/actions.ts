"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContract, removePrivate, uploadPrivate } from "@/lib/company";
import { ADDRESS_KINDS, PAY_METHODS, PLANS, SIGNER_ROLES, VENUE_KINDS } from "@/lib/contract";
import { db } from "@/lib/supabase";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const opt = (f: FormData, k: string, max = 200) => str(f, k, max) || null;
const int = (f: FormData, k: string) => Math.min(Math.max(Math.round(Number(str(f, k)) || 0), 0), 200);
const oneOf = <T extends readonly string[]>(v: string, list: T, fallback: T[number]) => ((list as readonly string[]).includes(v) ? v : fallback);

function fail(e: unknown): never {
  const msg = e instanceof Error ? e.message : "Error inesperado";
  redirect(`/admin/contratos/nuevo?error=${encodeURIComponent(msg)}`);
}

export async function createContract(f: FormData) {
  let id: string;
  try {
    const venue_name = str(f, "venue_name", 100);
    const street = str(f, "street", 120);
    const signer_name = str(f, "signer_name", 100);
    const sector = str(f, "sector_other", 60) || str(f, "sector", 60);
    if (!venue_name) throw new Error("Falta el nombre del local.");
    if (!street) throw new Error("Falta la calle o el nombre de la plaza.");
    if (!sector) throw new Error("Falta el sector.");
    if (!signer_name) throw new Error("Falta el nombre de quien firma.");
    const email = opt(f, "email", 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo no es válido.");
    const plan = str(f, "plan", 10);
    if (!(plan in PLANS)) throw new Error("Elige un plan.");
    const start = str(f, "start_date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("Falta la fecha de inicio.");
    const trial_mode = oneOf(str(f, "trial_mode", 10), ["done", "starts", "none"] as const, "done");
    const trialStart = str(f, "trial_start", 10);
    if (trial_mode === "done" && !/^\d{4}-\d{2}-\d{2}$/.test(trialStart)) throw new Error("Indica cuándo empezó la prueba gratis.");
    if (trial_mode === "done" && trialStart >= start) throw new Error("La prueba gratis tiene que haber empezado antes de la fecha de inicio del plan.");
    const plaques = int(f, "plaques");
    const waiter_cards = int(f, "waiter_cards");
    if (plaques + waiter_cards === 0) throw new Error("Indica al menos una placa o tarjeta.");
    if (plan === "plaque" && plaques > 1) throw new Error("La mensualidad es para 1 placa. De 2 placas en adelante es pago único: no necesita contrato.");

    const { data, error } = await db()
      .from("contracts")
      .insert({
        venue_name,
        venue_kind: str(f, "venue_kind_other", 40) || oneOf(str(f, "venue_kind", 40), VENUE_KINDS, "Restaurante"),
        address_kind: oneOf(str(f, "address_kind", 30), ADDRESS_KINDS, "Calle"),
        street,
        number_or_local: opt(f, "number_or_local", 30),
        sector,
        city: str(f, "city", 60) || "Ciudad de Panamá",
        signer_name,
        signer_role: oneOf(str(f, "signer_role", 40), SIGNER_ROLES, "Dueño/a"),
        signer_id: opt(f, "signer_id", 40),
        phone: opt(f, "phone", 30),
        email,
        plan,
        // Monthly and annual plans always include FiveTap Business; per-plaque is a choice.
        with_business: plan === "plaque" ? str(f, "with_business", 3) !== "no" : true,
        trial_mode,
        trial_start: trial_mode === "done" ? trialStart : null,
        plaques,
        waiter_cards,
        payment_method: oneOf(str(f, "payment_method", 20), PAY_METHODS, "Yappy"),
        start_date: start,
      })
      .select("id, number")
      .single();
    if (error) throw new Error(error.message);
    id = data.id as string;

    // The form sends the photo already resized to a JPEG data URL (camera or gallery).
    const logo = str(f, "logo_data", 4_000_000);
    const m = logo.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
    if (m) {
      try {
        const bytes = Buffer.from(m[2]!, "base64");
        const path = await uploadPrivate(`contracts/${id}.${m[1] === "png" ? "png" : "jpg"}`, new Blob([bytes]), `image/${m[1]}`);
        await db().from("contracts").update({ logo_path: path }).eq("id", id);
      } catch (e) {
        console.error("[contract logo]", e); // The contract still works without the logo.
      }
    }
  } catch (e) {
    fail(e);
  }
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${id}`);
}

export async function deleteContract(f: FormData) {
  const c = await getContract(str(f, "id", 60));
  if (c) {
    if (c.logo_path) await removePrivate(c.logo_path);
    await db().from("contracts").delete().eq("id", c.id);
  }
  revalidatePath("/admin/contratos");
  redirect("/admin/contratos");
}
