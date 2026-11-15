import "server-only";
import { todayPanama } from "./agenda";
import { asExperience, promoLive, type CatalogItem, type DayHours, type Experience, type Promotion, type Sections } from "./experience-shape";
import { db } from "./supabase";

// Reading and saving each business's NFC experience. Every query is scoped to one
// business id: nothing here can mix one venue's content with another's.

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_IMAGE = 3_000_000;

/** Uploads one image to the business's folder in the public "media" bucket. */
export async function uploadMedia(businessId: string, file: FormDataEntryValue | null, kind: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("La imagen debe ser PNG, JPG o WEBP.");
  if (file.size > MAX_IMAGE) throw new Error("La imagen debe pesar menos de 3 MB.");
  const path = `${businessId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await db().storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return db().storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Removes an image of this business from the bucket (best effort, never another business's). */
export async function removeMedia(businessId: string, url: string | null | undefined) {
  const path = url?.split("/media/")[1];
  if (!path || !decodeURIComponent(path).startsWith(`${businessId}/`)) return;
  await db().storage.from("media").remove([decodeURIComponent(path)]);
}

/** What a guest sees: the published experience, live promotions and active catalog items. */
export async function publishedExperience(businessId: string) {
  const [b, promos, items] = await Promise.all([
    db().from("businesses").select("experience, experience_published_at").eq("id", businessId).maybeSingle(),
    db().from("promotions").select("*").eq("business_id", businessId).eq("active", true).order("sort").order("created_at"),
    db().from("catalog_items").select("*").eq("business_id", businessId).eq("active", true).order("category").order("sort").order("created_at"),
  ]);
  if (!b.data?.experience) return null;
  const today = todayPanama();
  return {
    experience: asExperience(b.data.experience),
    promos: ((promos.data ?? []) as Promotion[]).filter((p) => promoLive(p, today)),
    items: ((items.data ?? []) as CatalogItem[]).map((i) => ({ ...i, price: i.price == null ? null : Number(i.price) })),
  };
}

/** Everything the editor needs: draft, published state, all promotions and items. */
export async function experienceEditor(businessId: string) {
  const [b, promos, items] = await Promise.all([
    db().from("businesses").select("experience, experience_draft, experience_published_at").eq("id", businessId).maybeSingle(),
    db().from("promotions").select("*").eq("business_id", businessId).order("sort").order("created_at"),
    db().from("catalog_items").select("*").eq("business_id", businessId).order("category").order("sort").order("created_at"),
  ]);
  const published = b.data?.experience ? asExperience(b.data.experience) : null;
  const draft = asExperience(b.data?.experience_draft ?? b.data?.experience ?? null);
  return {
    draft,
    published,
    publishedAt: (b.data?.experience_published_at as string | null) ?? null,
    pending: JSON.stringify(b.data?.experience_draft ?? null) !== JSON.stringify(b.data?.experience ?? null) && b.data?.experience_draft != null,
    promos: (promos.data ?? []) as Promotion[],
    items: ((items.data ?? []) as CatalogItem[]).map((i) => ({ ...i, price: i.price == null ? null : Number(i.price) })),
  };
}

const text = (f: FormData, k: string, max: number) => {
  const v = String(f.get(k) ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);
  return v || null;
};
const url = (f: FormData, k: string) => {
  const v = text(f, k, 400);
  if (!v) return null;
  const full = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(full);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    throw new Error(`Revisa el enlace: ${v}`);
  }
};
const time = (v: FormDataEntryValue | null) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);

/** Saves the founder's draft from the editor form (images included). Not visible to guests until published. */
export async function saveDraft(businessId: string, f: FormData) {
  const cur = (await experienceEditor(businessId)).draft;
  const hoursOn = f.get("hours_on") === "1";
  const hours: DayHours[] = hoursOn
    ? Array.from({ length: 7 }, (_, d) => {
        if (f.get(`closed_${d}`) === "1") return null;
        const open = time(f.get(`open_${d}`)), close = time(f.get(`close_${d}`));
        return open && close ? { open, close } : null;
      })
    : [];
  const sections = Object.fromEntries((["promos", "catalog", "gallery", "info", "location", "contact"] as (keyof Sections)[]).map((k) => [k, f.get(`sec_${k}`) === "1"])) as Sections;
  let cover = cur.cover_url;
  if (f.get("remove_cover") === "1") cover = null;
  const newCover = await uploadMedia(businessId, f.get("cover"), "cover");
  if (newCover) cover = newCover;
  const removed = new Set(f.getAll("remove_photo").map(String));
  const added = (await Promise.all(f.getAll("photos").map((p) => uploadMedia(businessId, p, "photo")))).filter((x): x is string => Boolean(x));
  const gallery = [...cur.gallery.filter((g) => !removed.has(g)), ...added].slice(0, 12);
  const next: Experience = {
    cover_url: cover,
    tagline: text(f, "tagline", 120),
    about: text(f, "about", 1200),
    policies: text(f, "policies", 800),
    catalog_title: text(f, "catalog_title", 30),
    hours,
    address: text(f, "address", 200),
    maps_url: url(f, "maps_url"),
    phone: text(f, "phone", 30),
    whatsapp: text(f, "whatsapp", 30),
    instagram: text(f, "instagram", 120),
    facebook: text(f, "facebook", 160),
    tiktok: text(f, "tiktok", 120),
    website: url(f, "website"),
    gallery,
    sections,
  };
  const { error } = await db().from("businesses").update({ experience_draft: next }).eq("id", businessId);
  if (error) throw new Error(error.message);
  return next;
}

/** Publishes the draft: from now on every plaque of this business opens it. */
export async function publishExperience(businessId: string) {
  const { data, error } = await db().from("businesses").select("experience_draft, experience").eq("id", businessId).maybeSingle();
  if (error) throw new Error(error.message);
  const draft = data?.experience_draft ?? data?.experience;
  if (!draft) throw new Error("Primero guarda la experiencia.");
  const up = await db().from("businesses").update({ experience: draft, experience_draft: draft, experience_published_at: new Date().toISOString() }).eq("id", businessId);
  if (up.error) throw new Error(up.error.message);
}

/** Back to the simple review card (the experience stays saved as draft). */
export async function unpublishExperience(businessId: string) {
  const { data } = await db().from("businesses").select("experience, experience_draft").eq("id", businessId).maybeSingle();
  const up = await db().from("businesses").update({ experience: null, experience_draft: data?.experience_draft ?? data?.experience ?? null, experience_published_at: null }).eq("id", businessId);
  if (up.error) throw new Error(up.error.message);
}

const date = (v: FormDataEntryValue | null) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Creates or updates a promotion of this business. */
export async function savePromotion(businessId: string, f: FormData) {
  const id = String(f.get("promo_id") ?? "");
  const title = text(f, "title", 80);
  if (!title || title.length < 2) throw new Error("Escribe el título de la promoción.");
  const starts = date(f.get("starts_on")), ends = date(f.get("ends_on"));
  if (starts && ends && ends < starts) throw new Error("La fecha final va después de la inicial.");
  const row: Record<string, unknown> = { title, body: text(f, "body", 400), starts_on: starts, ends_on: ends, active: f.get("active") !== "0" };
  const img = await uploadMedia(businessId, f.get("image"), "promo");
  if (img) row.image_url = img;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const before = (await db().from("promotions").select("image_url").eq("id", id).eq("business_id", businessId).maybeSingle()).data;
    if (!before) throw new Error("Promoción no encontrada.");
    if (f.get("remove_image") === "1") row.image_url = null;
    const { error } = await db().from("promotions").update(row).eq("id", id).eq("business_id", businessId);
    if (error) throw new Error(error.message);
    if ((img || f.get("remove_image") === "1") && before.image_url) await removeMedia(businessId, before.image_url);
  } else {
    const { error } = await db().from("promotions").insert({ ...row, business_id: businessId });
    if (error) throw new Error(error.message);
  }
}

export async function deletePromotion(businessId: string, id: string) {
  const { data } = await db().from("promotions").delete().eq("id", id).eq("business_id", businessId).select("image_url").maybeSingle();
  if (data?.image_url) await removeMedia(businessId, data.image_url);
}

/** Creates or updates a product or service of this business. */
export async function saveItem(businessId: string, f: FormData) {
  const id = String(f.get("item_id") ?? "");
  const name = text(f, "name", 80);
  if (!name || name.length < 2) throw new Error("Escribe el nombre del producto o servicio.");
  const rawPrice = String(f.get("price") ?? "").replace(",", ".").replace(/[^0-9.]/g, "");
  const price = rawPrice ? Math.round(Number(rawPrice) * 100) / 100 : null;
  if (price != null && !(price >= 0)) throw new Error("Revisa el precio.");
  const row: Record<string, unknown> = { name, category: text(f, "category", 40), description: text(f, "description", 300), price, active: f.get("active") !== "0" };
  const img = await uploadMedia(businessId, f.get("image"), "item");
  if (img) row.image_url = img;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const before = (await db().from("catalog_items").select("image_url").eq("id", id).eq("business_id", businessId).maybeSingle()).data;
    if (!before) throw new Error("Producto no encontrado.");
    if (f.get("remove_image") === "1") row.image_url = null;
    const { error } = await db().from("catalog_items").update(row).eq("id", id).eq("business_id", businessId);
    if (error) throw new Error(error.message);
    if ((img || f.get("remove_image") === "1") && before.image_url) await removeMedia(businessId, before.image_url);
  } else {
    const { error } = await db().from("catalog_items").insert({ ...row, business_id: businessId });
    if (error) throw new Error(error.message);
  }
}

export async function deleteItem(businessId: string, id: string) {
  const { data } = await db().from("catalog_items").delete().eq("id", id).eq("business_id", businessId).select("image_url").maybeSingle();
  if (data?.image_url) await removeMedia(businessId, data.image_url);
}

/** Turns a promotion or an item on or off (only of this business). */
export async function setActive(businessId: string, table: "promotions" | "catalog_items", id: string, active: boolean) {
  const { error } = await db().from(table).update({ active }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}
