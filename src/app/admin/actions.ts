"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newCode, slugify } from "@/lib/codes";
import { safeColor } from "@/lib/brand";
import { normalizePhone } from "@/lib/phone";
import { reviewUrlFrom } from "@/lib/site";
import { addReviewSnapshot, deleteReviewSnapshot } from "@/lib/data";
import { sendPush } from "@/lib/push";
import { db } from "@/lib/supabase";
import { VERTICALS, verticalByKey } from "@/lib/verticals";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const opt = (f: FormData, k: string, max = 200) => str(f, k, max) || null;
const num = (f: FormData, k: string, fallback: number) => {
  const n = Number(str(f, k));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const email = (v: string | null) => {
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error("El email del gerente no es válido.");
  return v;
};

const phone = (v: string | null, who = "del gerente") => {
  if (!v) return null;
  const n = normalizePhone(v);
  if (!n) throw new Error(`El WhatsApp ${who} no es válido.`);
  return n;
};

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function uploadLogo(file: FormDataEntryValue | null, slug: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = LOGO_TYPES[file.type];
  if (!ext) throw new Error("El logo debe ser PNG, JPG o WEBP.");
  if (file.size > 2_500_000) throw new Error("El logo debe pesar menos de 2.5 MB.");
  const path = `${slug}-${Date.now()}.${ext}`;
  const { error } = await db().storage.from("logos").upload(path, file, { contentType: file.type });
  if (error) throw new Error(`No se pudo subir el logo: ${error.message}`);
  return db().storage.from("logos").getPublicUrl(path).data.publicUrl;
}

/** Inserts `count` tags labelled "<label> <n>", retrying on the rare code collision. */
async function createTags(businessId: string, label: string, count: number, startAt: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    business_id: businessId,
    label: count === 1 && startAt === 1 ? label : `${label} ${startAt + i}`,
  }));
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await db().from("tags").insert(rows.map((r) => ({ ...r, code: newCode() })));
    if (!error) return;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudieron generar códigos únicos. Inténtalo otra vez.");
}

function fail(path: string, e: unknown): never {
  const msg = e instanceof Error ? e.message : "Error inesperado";
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

export async function createBusiness(f: FormData) {
  const name = str(f, "name", 80);
  const review = str(f, "review", 500);
  const kind = VERTICALS.some((v) => v.key === str(f, "kind")) ? str(f, "kind") : "restaurant";
  const spots = Math.min(Math.max(Math.round(num(f, "spots", 10)), 1), 80);
  const spotLabel = str(f, "spot_label", 30) || verticalByKey(kind).spot;
  if (!name || !review) fail("/admin/new", new Error("Escribe el nombre y el enlace de reseñas de Google."));

  let id: string;
  try {
    const slug = `${slugify(name)}-${newCode(4)}`;
    const logo_url = await uploadLogo(f.get("logo"), slug);
    const trialDays = 7;
    const { data, error } = await db()
      .from("businesses")
      .insert({
        slug,
        name,
        kind,
        logo_url,
        brand_color: safeColor(str(f, "brand_color")),
        google_review_url: reviewUrlFrom(review),
        manager_email: email(opt(f, "manager_email", 120)),
        manager_name: opt(f, "manager_name", 80),
        manager_phone: phone(opt(f, "manager_phone", 30)),
        billing_name: opt(f, "billing_name", 80),
        billing_phone: phone(opt(f, "billing_phone", 30), "de quien paga"),
        setup_fee: num(f, "setup_fee", 0),
        monthly_fee: num(f, "monthly_fee", 129),
        mode: str(f, "mode", 10) === "google" ? "google" : "full",
        status: "trial",
        trial_ends_at: new Date(Date.now() + trialDays * 864e5).toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
    await createTags(id, spotLabel, spots, 1);
    // Came from a self sign-up on /prueba: mark it as handled.
    const signup = str(f, "signup_id", 60);
    if (/^[0-9a-f-]{36}$/i.test(signup)) await db().from("signups").update({ business_id: id }).eq("id", signup);
  } catch (e) {
    fail("/admin/new", e);
  }
  revalidatePath("/admin");
  redirect(`/admin/b/${id}?ok=creado`);
}

export async function updateBusiness(f: FormData) {
  const id = str(f, "id", 60);
  const back = `/admin/b/${id}`;
  try {
    const patch: Record<string, unknown> = {
      name: str(f, "name", 80),
      kind: str(f, "kind", 30),
      brand_color: safeColor(str(f, "brand_color")),
      google_review_url: reviewUrlFrom(str(f, "review", 500)),
      manager_email: email(opt(f, "manager_email", 120)),
      manager_name: opt(f, "manager_name", 80),
      manager_phone: phone(opt(f, "manager_phone", 30)),
      billing_name: opt(f, "billing_name", 80),
      billing_phone: phone(opt(f, "billing_phone", 30), "de quien paga"),
      status: str(f, "status", 20),
      setup_fee: num(f, "setup_fee", 0),
      monthly_fee: num(f, "monthly_fee", 129),
      mode: str(f, "mode", 10) === "google" ? "google" : "full",
      trial_ends_at: opt(f, "trial_ends_at", 10),
      notes: opt(f, "notes", 2000),
    };
    if (!patch.name || !str(f, "review")) throw new Error("Nombre y Google son obligatorios.");
    const logo = await uploadLogo(f.get("logo"), id.slice(0, 8));
    if (logo) patch.logo_url = logo;
    const { error } = await db().from("businesses").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=guardado`);
}

export async function addTags(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const label = str(f, "label", 30) || "Mesa";
    const count = Math.min(Math.max(Math.round(num(f, "count", 1)), 1), 80);
    const { count: existing, error } = await db()
      .from("tags")
      .select("id", { count: "exact", head: true })
      .eq("business_id", id)
      .like("label", `${label}%`);
    if (error) throw new Error(error.message);
    await createTags(id, label, count, (existing ?? 0) + 1);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=placas`);
}

export async function setTagActive(f: FormData) {
  const id = str(f, "business_id", 60);
  const { error } = await db().from("tags").update({ active: str(f, "active") === "1" }).eq("id", str(f, "tag_id", 60));
  if (error) fail(`/admin/b/${id}`, new Error(error.message));
  revalidatePath(`/admin/b/${id}`);
}

export async function recordPayment(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const amount = num(f, "amount", 0);
    if (amount <= 0) throw new Error("Monto inválido.");
    const { error } = await db().from("payments").insert({
      business_id: id,
      amount,
      kind: str(f, "kind", 10),
      method: str(f, "method", 10),
      reference: opt(f, "reference", 120),
    });
    if (error) throw new Error(error.message);
    // First payment turns a trial into a paying customer.
    await db().from("businesses").update({ status: "active" }).eq("id", id).eq("status", "trial");
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=pago`);
}

/** Google review count taken by hand: the first one before FiveTap, then each month. */
export async function addSnapshot(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const reviews = Math.round(num(f, "reviews", -1));
    if (reviews < 0) throw new Error("Escribe cuántas reseñas tiene en Google.");
    const ratingRaw = str(f, "rating", 4).replace(",", ".");
    const rating = ratingRaw ? Number(ratingRaw) : null;
    if (rating !== null && !(rating >= 1 && rating <= 5)) throw new Error("Las estrellas van de 1 a 5 (ej. 4.6).");
    const taken_on = /^\d{4}-\d{2}-\d{2}$/.test(str(f, "taken_on", 10)) ? str(f, "taken_on", 10) : new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
    await addReviewSnapshot({ business_id: id, taken_on, reviews, rating: rating === null ? null : Math.round(rating * 10) / 10 });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=resenas#resenas`);
}

export async function removeSnapshot(f: FormData) {
  const id = str(f, "business_id", 60);
  try {
    await deleteReviewSnapshot(str(f, "snapshot_id", 60));
  } catch (e) {
    fail(`/admin/b/${id}`, e);
  }
  revalidatePath(`/admin/b/${id}`);
}

/** Test notification to the owner's and manager's phones. */
export async function testOwnerPush(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  const { data: b } = await db().from("businesses").select("name, owner_token").eq("id", id).maybeSingle();
  const sent = b ? await sendPush({ role: ["owner", "manager"], businessId: id }, { title: `FiveTap · ${b.name}`, body: "¡Listo! Las notificaciones de FiveTap están activas en este celular. 🎉", url: `/mi/${b.owner_token}` }) : 0;
  redirect(`${back}?${sent ? "ok=push" : "error=" + encodeURIComponent("Ningún celular del local tiene las notificaciones activas todavía.")}#app`);
}

/** New private link for the venue: the old one stops working and its phones stop getting notifications. */
export async function resetOwnerLink(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await db().from("businesses").update({ owner_token: token }).eq("id", id);
    if (error) throw new Error(error.message);
    await db().from("push_subscriptions").delete().eq("business_id", id);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=enlace#app`);
}

export async function renameTag(f: FormData) {
  const id = str(f, "business_id", 60);
  const label = str(f, "label", 40);
  if (label) {
    const { error } = await db().from("tags").update({ label }).eq("id", str(f, "tag_id", 60));
    if (error) fail(`/admin/b/${id}`, new Error(error.message));
  }
  revalidatePath(`/admin/b/${id}`);
}

export async function removeContact(f: FormData) {
  const id = str(f, "business_id", 60);
  const { error } = await db().from("contacts").delete().eq("id", str(f, "contact_id", 60));
  if (error) fail(`/admin/b/${id}`, new Error(error.message));
  revalidatePath(`/admin/b/${id}`);
}

/** Deletes a business and everything under it (placas, toques, mensajes, club, pagos). */
export async function deleteBusiness(f: FormData) {
  const id = str(f, "id", 60);
  const back = `/admin/b/${id}`;
  try {
    const { data: b, error } = await db().from("businesses").select("name, logo_url").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Error("El negocio no existe.");
    if (str(f, "confirm", 80) !== b.name) throw new Error("Escribe el nombre exacto del negocio para eliminarlo.");
    const del = await db().from("businesses").delete().eq("id", id);
    if (del.error) throw new Error(del.error.message);
    const logo = b.logo_url?.split("/logos/")[1];
    if (logo) await db().storage.from("logos").remove([decodeURIComponent(logo)]);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath("/admin");
  redirect("/admin?ok=eliminado");
}
