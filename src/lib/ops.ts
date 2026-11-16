import "server-only";
import { todayPanama } from "./agenda";
import { safeColor } from "./brand";
import { newCode, slugify } from "./codes";
import { addReviewSnapshot } from "./data";
import { asExperience, checkSocial, EMPTY_EXPERIENCE, waDigits, type DayHours, type Experience, type Sections } from "./experience-shape";
import { deleteItem, deletePromotion, experienceEditor, publishExperience, saveItem, savePromotion } from "./experience";
import { MODULES, moduleOn, setModule, type ModuleKey } from "./orders";
import { normalizePhone } from "./phone";
import { getPlans, planByKey } from "./plans";
import { presetFor } from "./presets";
import { audit } from "./receipts";
import { SITE_URL, nfcUrl, reviewUrlFrom } from "./site";
import { db } from "./supabase";
import { PANEL_KINDS, verticalByKey } from "./verticals";
import { ONE_TIME } from "./test-kit";

// FiveTap operations for Claude (the MCP endpoint at /api/ops/mcp). Every tool works on ONE
// business named by its id; the important ones also need its exact name, so Claude cannot
// touch the wrong venue. There is deliberately no tool to change prices or plans of an
// existing business, delete a business or read payments: those stay in the founder's panel.
// Every call is written to the audit log as "claude.<tool>".

export class OpsError extends Error {}
const fail = (m: string): never => { throw new OpsError(m); };

type Biz = { id: string; name: string; kind: string; status: string; plan_key: string | null; monthly_fee: number; mode: string; modules: Record<string, unknown> | null; logo_url: string | null; owner_token: string };

const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || null;

async function biz(id: unknown): Promise<Biz> {
  if (!isId(id)) fail("business_id no válido: usa find_business para obtenerlo.");
  const { data } = await db().from("businesses").select("id, name, kind, status, plan_key, monthly_fee, mode, modules, logo_url, owner_token").eq("id", id as string).maybeSingle();
  if (!data) fail("Negocio no encontrado.");
  return data as Biz;
}

/** The safety catch: the exact name of the business, so a wrong id never goes through. */
function confirmName(b: Biz, typed: unknown) {
  if (str(typed, 120).toLowerCase() !== b.name.trim().toLowerCase()) fail(`Para esta acción escribe en confirm_business_name el nombre exacto del negocio: “${b.name}”.`);
}

const log = (tool: string, b: { id: string; name: string } | null, details: Record<string, unknown> = {}) =>
  audit(`claude.${tool}`, { businessId: b?.id ?? null, entity: "business", entityId: b?.name ?? undefined, details: { actor: "claude", ...details } });

/** FormData from a plain object, to reuse the same validated save functions the panel uses. */
function form(o: Record<string, unknown>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) f.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  return f;
}

const summary = async (b: Biz) => {
  const [x, tags] = await Promise.all([experienceEditor(b.id), db().from("tags").select("kind, status, active").eq("business_id", b.id)]);
  const t = (tags.data ?? []) as { kind: string; status: string; active: boolean }[];
  const plans = await getPlans();
  return {
    id: b.id, name: b.name, kind: verticalByKey(b.kind).label, status: b.status,
    plan: b.mode === "google" && Number(b.monthly_fee) <= 0 && !b.plan_key ? "Pago único (directo a Google)" : plans.find((p) => p.key === b.plan_key)?.name ?? "Personalizado",
    monthly_fee: Number(b.monthly_fee),
    modules: Object.fromEntries((Object.keys(MODULES) as ModuleKey[]).map((k) => [k, moduleOn(b, k)])),
    plaques: t.filter((x) => x.kind !== "waiter" && x.active).length,
    team_cards: t.filter((x) => x.kind === "waiter" && x.active).length,
    experience: { published: Boolean(x.published), published_at: x.publishedAt, pending_changes: x.pending, draft: x.draft },
    promotions: x.promos.map((p) => ({ id: p.id, title: p.title, active: p.active, ends_on: p.ends_on })),
    items: x.items.map((i) => ({ id: i.id, name: i.name, category: i.category, price: i.price, active: i.active })),
    preview_url: `${SITE_URL}/admin/b/${b.id}/experiencia/vista`,
    editor_url: `${SITE_URL}/admin/b/${b.id}/experiencia`,
  };
};

async function createTags(businessId: string, label: string, count: number, startAt: number, kind: "table" | "waiter") {
  if (count < 1) return;
  const rows = Array.from({ length: count }, (_, i) => ({ business_id: businessId, kind, label: count === 1 && startAt === 1 ? label : `${label} ${startAt + i}` }));
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await db().from("tags").insert(rows.map((r) => ({ ...r, code: newCode() })));
    if (!error) return;
    if (error.code !== "23505") fail(error.message);
  }
  fail("No se pudieron generar códigos únicos.");
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Reads an image from base64 or an https link: PNG/JPG/WEBP up to 3 MB. */
async function imageFrom(a: Record<string, unknown>): Promise<File> {
  let bytes: Uint8Array, type: string;
  if (typeof a.image_base64 === "string" && a.image_base64) {
    const raw = a.image_base64.replace(/^data:([^;]+);base64,/, (_m, t) => { a.content_type ??= t; return ""; });
    bytes = Uint8Array.from(Buffer.from(raw, "base64"));
    type = str(a.content_type, 40) || "image/jpeg";
  } else if (typeof a.image_url === "string" && /^https:\/\//i.test(a.image_url)) {
    const res = await fetch(a.image_url, { redirect: "follow", signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!res?.ok) fail("No se pudo descargar la imagen de ese enlace.");
    type = (res!.headers.get("content-type") ?? "").split(";")[0]!.trim();
    bytes = new Uint8Array(await res!.arrayBuffer());
  } else {
    return fail("Envía image_base64 (con content_type) o image_url (https).");
  }
  if (!IMAGE_TYPES[type]) fail("La imagen debe ser PNG, JPG o WEBP.");
  if (bytes.byteLength > 3_000_000) fail("La imagen debe pesar menos de 3 MB.");
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([buf], `claude.${IMAGE_TYPES[type]}`, { type });
}

async function upload(bucket: "media" | "logos", path: string, file: File) {
  const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) fail(`No se pudo subir la imagen: ${error.message}`);
  return db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const PLAN_KEYS_ALLOWED = ["once"];

// ---------------- the tools ----------------

export const TOOLS = {
  find_business: {
    description: "Busca negocios de FiveTap por nombre (o parte). Devuelve id, nombre, tipo, estado y plan. Úsalo siempre antes de cambiar algo para tener el id correcto.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Nombre o parte del nombre" } }, required: ["query"] },
    async run(a: Record<string, unknown>) {
      const q = str(a.query, 80);
      if (q.length < 2) fail("Escribe al menos 2 letras del nombre.");
      const { data } = await db().from("businesses").select("id, name, kind, status, plan_key, monthly_fee, mode").ilike("name", `%${q.replace(/[%_]/g, "")}%`).order("name").limit(10);
      return { results: ((data ?? []) as Biz[]).map((b) => ({ id: b.id, name: b.name, kind: verticalByKey(b.kind).label, status: b.status })) };
    },
  },
  get_business: {
    description: "Detalle de un negocio: plan, módulos, placas, borrador y estado de su experiencia NFC, promociones y productos, y enlaces de vista previa.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" } }, required: ["business_id"] },
    async run(a: Record<string, unknown>) { return summary(await biz(a.business_id)); },
  },
  list_options: {
    description: "Tipos de negocio y planes disponibles para registrar (con lo que se configura solo según el tipo).",
    inputSchema: { type: "object", properties: {} },
    async run() {
      const plans = (await getPlans()).filter((p) => p.active);
      return {
        kinds: PANEL_KINDS.map((v) => ({ key: v.key, label: v.label, setup: presetFor(v.key).summary })),
        plans: [{ key: "once", name: `Pago único de 1 a ${ONE_TIME.max} piezas (directas a Google, sin sistema)` }, ...plans.map((p) => ({ key: p.key, name: p.name, monthly: p.monthly, plaques: p.plaques, cards: p.cards }))],
      };
    },
  },
  create_business: {
    description: "Registra un negocio nuevo con el plan que el fundador indicó (el precio sale del plan; no se inventan precios). Configura módulos y apartados según su tipo, crea sus placas y deja la experiencia NFC en borrador (sin publicar). Pide confirmación al fundador antes de llamarlo.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }, kind: { type: "string", description: "Clave de list_options.kinds" },
        plan_key: { type: "string", description: "Clave de list_options.plans (once o un plan)" },
        google_review_url: { type: "string", description: "Enlace de reseñas de Google o Place ID" },
        plaques: { type: "integer", minimum: 0, maximum: 80 }, team_cards: { type: "integer", minimum: 0, maximum: 40 },
        reviews_start: { type: "integer", minimum: 0, description: "Reseñas que tiene hoy en Google (el antes)" },
        rating_start: { type: "number", minimum: 1, maximum: 5 },
        manager_name: { type: "string" }, manager_phone: { type: "string" }, billing_name: { type: "string" }, billing_phone: { type: "string" },
        brand_color: { type: "string", description: "#RRGGBB" },
      },
      required: ["name", "kind", "plan_key", "google_review_url", "reviews_start"],
    },
    async run(a: Record<string, unknown>) {
      const name = str(a.name, 80);
      if (name.length < 2) fail("Falta el nombre del negocio.");
      const kind = PANEL_KINDS.some((v) => v.key === a.kind) ? (a.kind as string) : fail("Tipo de negocio no válido: usa list_options.");
      const key = str(a.plan_key, 30);
      const plan = PLAN_KEYS_ALLOWED.includes(key) ? null : await planByKey(key);
      if (!PLAN_KEYS_ALLOWED.includes(key) && !plan?.active) fail("Plan no válido: usa list_options.");
      const { data: dup } = await db().from("businesses").select("id").ilike("name", name).limit(1);
      if (dup?.length) fail(`Ya existe un negocio llamado “${name}”. Revisa con find_business antes de crear otro.`);
      const once = key === "once", test = key === "test";
      const reviews = Number(a.reviews_start);
      if (!(Number.isInteger(reviews) && reviews >= 0)) fail("reviews_start debe ser el número de reseñas actuales en Google.");
      const rating = a.rating_start == null ? null : Math.round(Number(a.rating_start) * 10) / 10;
      if (rating !== null && !(rating >= 1 && rating <= 5)) fail("rating_start va de 1 a 5.");
      let review: string;
      try { review = reviewUrlFrom(str(a.google_review_url, 500)); } catch (e) { return fail(e instanceof Error ? e.message : "Enlace de reseñas no válido."); }
      const phone = (v: unknown) => { const s = str(v, 30); if (!s) return null; return normalizePhone(s) ?? fail(`Teléfono no válido: ${s}`); };
      const preset = presetFor(kind);
      const spots = Math.min(Math.max(Math.round(Number(a.plaques ?? (once || test ? 1 : plan!.plaques))), 0), 80);
      const cards = Math.min(Math.max(Math.round(Number(a.team_cards ?? (once || test ? 0 : plan!.cards))), 0), 40);
      if (once && (spots + cards < 1 || spots + cards > ONE_TIME.max)) fail(`El pago único es de 1 a ${ONE_TIME.max} piezas; desde ${ONE_TIME.max + 1} va un plan mensual.`);
      const { data, error } = await db().from("businesses").insert({
        slug: `${slugify(name)}-${newCode(4)}`, name, kind, brand_color: safeColor(str(a.brand_color, 7)), google_review_url: review,
        manager_name: opt(a.manager_name, 80), manager_phone: phone(a.manager_phone), billing_name: opt(a.billing_name, 80), billing_phone: phone(a.billing_phone),
        monthly_fee: once || test ? 0 : plan!.monthly, plan_key: plan?.key ?? null, mode: once ? "google" : "full",
        status: test ? "trial" : "active", trial_ends_at: null, modules: preset.modules,
        experience_draft: { ...EMPTY_EXPERIENCE, sections: preset.sections, catalog_title: preset.catalog_title },
      }).select("id").single();
      if (error) fail(error.message);
      const id = data!.id as string;
      await createTags(id, verticalByKey(kind).spot, spots, 1, "table");
      await createTags(id, "Mesero", cards, 1, "waiter");
      await addReviewSnapshot({ business_id: id, taken_on: todayPanama(), reviews, rating });
      await log("create_business", { id, name }, { plan: key, kind, plaques: spots, cards });
      return { created: true, ...(await summary(await biz(id))), note: test ? "FiveTap Test: revisa la fecha de fin en el panel." : undefined };
    },
  },
  update_experience_draft: {
    description: "Cambia el BORRADOR de la experiencia NFC (no se publica): frase, descripción, políticas, nombre del catálogo, horario, dirección, Maps, teléfono, WhatsApp, Instagram, TikTok, Facebook, web, Wi-Fi de clientes (wifi_ssid, wifi_password) y apartados visibles. Solo cambia los campos que envíes. Valida redes (solo su dominio) y WhatsApp.",
    inputSchema: {
      type: "object",
      properties: {
        business_id: { type: "string" },
        tagline: { type: "string" }, about: { type: "string" }, policies: { type: "string" }, catalog_title: { type: "string" },
        hours: { type: "array", description: "7 elementos, domingo=0..sábado=6: {open:'HH:MM', close:'HH:MM'} o null si cierra", items: { type: ["object", "null"] } },
        address: { type: "string" }, maps_url: { type: "string" }, phone: { type: "string" }, whatsapp: { type: "string" },
        instagram: { type: "string" }, tiktok: { type: "string" }, facebook: { type: "string" }, website: { type: "string" },
        wifi_ssid: { type: "string", description: "Solo la red de clientes" }, wifi_password: { type: "string" },
        sections: { type: "object", description: "promos, catalog, gallery, info, location, contact, social: true/false" },
      },
      required: ["business_id"],
    },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id);
      const { data } = await db().from("businesses").select("experience, experience_draft").eq("id", b.id).maybeSingle();
      const cur = asExperience(data?.experience_draft ?? data?.experience ?? null);
      const next: Experience = { ...cur };
      const changed: string[] = [];
      const setText = (k: "tagline" | "about" | "policies" | "catalog_title" | "address" | "phone", max: number) => { if (k in a) { next[k] = typeof a[k] === "string" ? String(a[k]).trim().slice(0, max) || null : null; changed.push(k); } };
      setText("tagline", 120); setText("about", 1200); setText("policies", 800); setText("catalog_title", 30); setText("address", 200); setText("phone", 30);
      const url = (v: unknown, name: string) => { const s = str(v, 400); if (!s) return null; try { const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return u.toString(); } catch { return fail(`Revisa el enlace de ${name}.`); } };
      if ("maps_url" in a) { next.maps_url = url(a.maps_url, "Maps"); changed.push("maps_url"); }
      if ("website" in a) { next.website = url(a.website, "la web"); changed.push("website"); }
      if ("wifi_ssid" in a) { next.wifi_ssid = str(a.wifi_ssid, 64) || null; if (!next.wifi_ssid) next.wifi_password = null; changed.push("wifi_ssid"); }
      if ("wifi_password" in a) { next.wifi_password = next.wifi_ssid ? str(a.wifi_password, 64) || null : null; changed.push("wifi_password"); }
      if ("whatsapp" in a) { const w = str(a.whatsapp, 30); if (w && !waDigits(w)) fail("WhatsApp no válido: 8 dígitos o con código de país."); next.whatsapp = w || null; changed.push("whatsapp"); }
      for (const k of ["instagram", "tiktok", "facebook"] as const) if (k in a) { const r = checkSocial(k, typeof a[k] === "string" ? (a[k] as string) : null); if (r.error) fail(r.error); next[k] = r.value; changed.push(k); }
      if ("hours" in a) {
        const h = a.hours;
        if (h === null || (Array.isArray(h) && h.length === 0)) next.hours = [];
        else if (Array.isArray(h) && h.length === 7) next.hours = h.map((d) => (d && typeof d === "object" && /^\d{2}:\d{2}$/.test(String((d as { open?: string }).open)) && /^\d{2}:\d{2}$/.test(String((d as { close?: string }).close)) ? { open: (d as { open: string }).open, close: (d as { close: string }).close } : null)) as DayHours[];
        else fail("hours debe tener 7 elementos (domingo a sábado).");
        changed.push("hours");
      }
      if (a.sections && typeof a.sections === "object") { next.sections = { ...next.sections, ...Object.fromEntries(Object.entries(a.sections as Record<string, unknown>).filter(([k]) => k in next.sections).map(([k, v]) => [k, Boolean(v)])) } as Sections; changed.push("sections"); }
      if (!changed.length) fail("No enviaste ningún campo para cambiar.");
      const { error } = await db().from("businesses").update({ experience_draft: next }).eq("id", b.id);
      if (error) fail(error.message);
      await log("update_experience_draft", b, { fields: changed });
      return { saved: true, published: false, changed, preview_url: `${SITE_URL}/admin/b/${b.id}/experiencia/vista`, note: "Es borrador: usa publish_experience cuando el fundador lo apruebe." };
    },
  },
  set_brand_colors: {
    description: "Fija los colores del negocio en su página NFC: primary (portada y botón de reseña) y accent (iconos), en hex #RRGGBB. Úsalo después de mirar el logo y elegir colores fieles a su identidad; el texto siempre se ajusta para leerse bien. Se ve al instante (no es borrador). Requiere confirm_business_name.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, primary: { type: "string" }, accent: { type: "string" }, confirm_business_name: { type: "string" } }, required: ["business_id", "primary", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      const ok = (v: unknown) => /^#[0-9a-f]{6}$/i.test(str(v, 7));
      if (!ok(a.primary)) fail("primary debe ser un color hex como #1F6F5C.");
      if (a.accent != null && !ok(a.accent)) fail("accent debe ser un color hex como #E0A93B.");
      const before = (await db().from("businesses").select("brand_color, brand_accent").eq("id", b.id).maybeSingle()).data;
      const patch = { brand_color: str(a.primary, 7).toLowerCase(), brand_accent: a.accent ? str(a.accent, 7).toLowerCase() : null };
      const { error } = await db().from("businesses").update(patch).eq("id", b.id);
      if (error) fail(error.message);
      await log("set_brand_colors", b, { from: before, to: patch });
      return { saved: true, ...patch, preview_url: `${SITE_URL}/admin/b/${b.id}/experiencia/vista` };
    },
  },
  upload_image: {
    description: "Sube una imagen (PNG/JPG/WEBP hasta 3 MB) por base64 o enlace https. target: logo (se ve al instante), cover o gallery (borrador), promotion o item (con target_id).",
    inputSchema: {
      type: "object",
      properties: {
        business_id: { type: "string" }, target: { type: "string", enum: ["logo", "cover", "gallery", "promotion", "item"] }, target_id: { type: "string" },
        image_base64: { type: "string" }, content_type: { type: "string" }, image_url: { type: "string" },
      },
      required: ["business_id", "target"],
    },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id);
      const file = await imageFrom(a);
      const target = str(a.target, 20);
      const name = `${b.id}/${target}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${IMAGE_TYPES[file.type]}`;
      if (target === "logo") {
        const urlOut = await upload("logos", `${b.id.slice(0, 8)}-${Date.now()}.${IMAGE_TYPES[file.type]}`, file);
        await db().from("businesses").update({ logo_url: urlOut }).eq("id", b.id);
        await log("upload_image", b, { target });
        return { uploaded: true, target, url: urlOut, note: "El logo se ve al instante en sus placas." };
      }
      if (target === "cover" || target === "gallery") {
        const urlOut = await upload("media", name, file);
        const { data } = await db().from("businesses").select("experience, experience_draft").eq("id", b.id).maybeSingle();
        const cur = asExperience(data?.experience_draft ?? data?.experience ?? null);
        const next = target === "cover" ? { ...cur, cover_url: urlOut } : { ...cur, gallery: [...cur.gallery, urlOut].slice(0, 12) };
        await db().from("businesses").update({ experience_draft: next }).eq("id", b.id);
        await log("upload_image", b, { target });
        return { uploaded: true, target, url: urlOut, published: false };
      }
      if (target === "promotion" || target === "item") {
        if (!isId(a.target_id)) fail("Falta target_id de la promoción o el producto.");
        const table = target === "promotion" ? "promotions" : "catalog_items";
        const { data: row } = await db().from(table).select("id").eq("id", a.target_id as string).eq("business_id", b.id).maybeSingle();
        if (!row) fail("Ese elemento no es de este negocio.");
        const urlOut = await upload("media", name, file);
        await db().from(table).update({ image_url: urlOut }).eq("id", a.target_id as string).eq("business_id", b.id);
        await log("upload_image", b, { target, target_id: a.target_id });
        return { uploaded: true, target, url: urlOut, note: "Se ve al instante si el elemento está activo." };
      }
      return fail("target no válido.");
    },
  },
  upsert_promotion: {
    description: "Crea (sin promotion_id) o edita una promoción del negocio. Si está activa y en fecha, se ve al instante en sus placas.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, promotion_id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, starts_on: { type: "string", description: "AAAA-MM-DD" }, ends_on: { type: "string", description: "AAAA-MM-DD" }, active: { type: "boolean" } }, required: ["business_id", "title"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id);
      await savePromotion(b.id, form({ promo_id: a.promotion_id, title: a.title, body: a.body, starts_on: a.starts_on, ends_on: a.ends_on, active: a.active === false ? "0" : "1" }));
      await log("upsert_promotion", b, { title: str(a.title, 80), edited: isId(a.promotion_id) });
      return { saved: true, promotions: (await summary(b)).promotions };
    },
  },
  delete_promotion: {
    description: "Elimina una promoción. Requiere confirm_business_name con el nombre exacto del negocio.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, promotion_id: { type: "string" }, confirm_business_name: { type: "string" } }, required: ["business_id", "promotion_id", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      if (!isId(a.promotion_id)) fail("promotion_id no válido.");
      await deletePromotion(b.id, a.promotion_id as string);
      await log("delete_promotion", b, { promotion_id: a.promotion_id });
      return { deleted: true };
    },
  },
  upsert_item: {
    description: "Crea (sin item_id) o edita un producto o servicio del catálogo. price es opcional (sin precio no se puede pedir).",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, item_id: { type: "string" }, name: { type: "string" }, category: { type: "string" }, description: { type: "string" }, price: { type: "number", minimum: 0 }, active: { type: "boolean" } }, required: ["business_id", "name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id);
      await saveItem(b.id, form({ item_id: a.item_id, name: a.name, category: a.category, description: a.description, price: a.price, active: a.active === false ? "0" : "1" }));
      await log("upsert_item", b, { name: str(a.name, 80), edited: isId(a.item_id) });
      return { saved: true, items: (await summary(b)).items };
    },
  },
  delete_item: {
    description: "Elimina un producto o servicio. Requiere confirm_business_name.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, item_id: { type: "string" }, confirm_business_name: { type: "string" } }, required: ["business_id", "item_id", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      if (!isId(a.item_id)) fail("item_id no válido.");
      await deleteItem(b.id, a.item_id as string);
      await log("delete_item", b, { item_id: a.item_id });
      return { deleted: true };
    },
  },
  set_module: {
    description: "Activa o apaga Pedidos (orders) o Reservas (reservations) de un negocio, o lo deja según su plan (enabled: null). Requiere confirm_business_name.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, module: { type: "string", enum: ["orders", "reservations"] }, enabled: { type: ["boolean", "null"] }, confirm_business_name: { type: "string" } }, required: ["business_id", "module", "enabled", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      const key = (["orders", "reservations"] as ModuleKey[]).find((k) => k === a.module) ?? fail("module debe ser orders o reservations.");
      await setModule(b.id, key, typeof a.enabled === "boolean" ? a.enabled : null);
      await log("set_module", b, { module: key, enabled: a.enabled });
      return { saved: true, modules: (await summary(await biz(b.id))).modules };
    },
  },
  add_plaques: {
    description: "Crea placas (table) o tarjetas de equipo (waiter) nuevas para el negocio, numeradas a continuación. Requiere confirm_business_name.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 50 }, kind: { type: "string", enum: ["table", "waiter"] }, label: { type: "string", description: "Mesa, Barra, Caja, Mesero…" }, confirm_business_name: { type: "string" } }, required: ["business_id", "count", "kind", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      const count = Math.round(Number(a.count));
      if (!(count >= 1 && count <= 50)) fail("count va de 1 a 50.");
      const kind = a.kind === "waiter" ? "waiter" : "table";
      const label = str(a.label, 30) || (kind === "waiter" ? "Mesero" : verticalByKey(b.kind).spot);
      const { count: existing } = await db().from("tags").select("id", { count: "exact", head: true }).eq("business_id", b.id).like("label", `${label}%`);
      await createTags(b.id, label, count, (existing ?? 0) + 1, kind);
      const { data: fresh } = await db().from("tags").select("label, code").eq("business_id", b.id).order("created_at", { ascending: false }).limit(count);
      await log("add_plaques", b, { count, kind, label });
      return { created: count, pieces: ((fresh ?? []) as { label: string; code: string }[]).sort((x, y) => x.label.localeCompare(y.label, "es", { numeric: true })).map((t) => ({ label: t.label, nfc_url: nfcUrl(t.code) })), note: "Graba cada enlace en su placa con NFC Tools." };
    },
  },
  publish_experience: {
    description: "Publica el borrador de la experiencia NFC: todas las placas del negocio lo muestran al instante. SOLO cuando el fundador lo aprobó explícitamente tras ver la vista previa. Requiere confirm_business_name.",
    inputSchema: { type: "object", properties: { business_id: { type: "string" }, confirm_business_name: { type: "string" } }, required: ["business_id", "confirm_business_name"] },
    async run(a: Record<string, unknown>) {
      const b = await biz(a.business_id); confirmName(b, a.confirm_business_name);
      if (b.mode === "google") fail("Este negocio es de pago único: sus placas van directo a Google y no muestran experiencia.");
      await publishExperience(b.id);
      await log("publish_experience", b);
      const { data: one } = await db().from("tags").select("code").eq("business_id", b.id).eq("active", true).limit(1);
      const code = (one?.[0] as { code: string } | undefined)?.code;
      return { published: true, live_example: code ? `${nfcUrl(code)}?preview=1` : null };
    },
  },
  recent_activity: {
    description: "Últimas acciones hechas por Claude en FiveTap (para revisar qué se cambió).",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } },
    async run(a: Record<string, unknown>) {
      const { data } = await db().from("audit_log").select("at, action, entity_id, details").like("action", "claude.%").order("at", { ascending: false }).limit(Math.min(Math.max(Number(a.limit) || 15, 1), 50));
      return { activity: data ?? [] };
    },
  },
} as const;

export type ToolName = keyof typeof TOOLS;
