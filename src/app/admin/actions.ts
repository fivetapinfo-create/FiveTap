"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { newCode, slugify } from "@/lib/codes";
import { safeColor } from "@/lib/brand";
import { normalizePhone } from "@/lib/phone";
import { placeIdFrom, reviewUrlFrom } from "@/lib/site";
import { addDays, todayPanama } from "@/lib/agenda";
import { AGREEMENT_METHODS, SIGNER_ROLES, endOf } from "@/lib/agreement";
import { PLAN_TEST_PRODUCTS, TEST_ACTIVE_DAYS, type PlanTestProduct } from "@/lib/test-kit";
import { PLANS_TAG, getPlans, planByKey, planOf } from "@/lib/plans";
import { addReviewSnapshot, billingOf, deleteReviewSnapshot, snapshotFromGoogle } from "@/lib/data";
import { placesReady } from "@/lib/places";
import { renewCode } from "@/lib/access";
import { sendPush } from "@/lib/push";
import { audit, deliverReceipt, issueReceipt, logSend, receiptMoney, receiptUrl } from "@/lib/receipts";
import { whatsappApiReady, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { db } from "@/lib/supabase";
import { PANEL_KINDS, verticalByKey } from "@/lib/verticals";

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
async function createTags(businessId: string, label: string, count: number, startAt: number, kind: "table" | "waiter" = "table") {
  if (count < 1) return;
  const rows = Array.from({ length: count }, (_, i) => ({
    business_id: businessId,
    kind,
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
  const kind = PANEL_KINDS.some((v) => v.key === str(f, "kind")) ? str(f, "kind") : "restaurant";
  // The plan sets the price and how many table plaques and waiter cards to create;
  // each one can be changed in the form (an empty field means "the plan's").
  // FiveTap Test: 7 days with one piece and no monthly fee; then it pauses until a plan is picked.
  if (!str(f, "plan_key", 30)) fail("/admin/new", new Error("Elige qué contrató el local: FiveTap Test o un plan."));
  const isTest = str(f, "plan_key", 30).startsWith("test");
  const noApp = str(f, "plan_key", 30) === "test-google";
  const plan = isTest ? null : await planByKey(str(f, "plan_key", 30));
  const spots = Math.min(Math.max(Math.round(str(f, "spots") === "" ? (isTest ? 1 : plan?.plaques ?? 10) : num(f, "spots", 10)), 0), 80);
  const cards = Math.min(Math.max(Math.round(str(f, "cards") === "" ? (isTest ? 0 : plan?.cards ?? 0) : num(f, "cards", 0)), 0), 40);
  const fee = isTest ? 0 : str(f, "monthly_fee") === "" ? plan?.monthly ?? 129 : num(f, "monthly_fee", 129);
  const spotLabel = str(f, "spot_label", 30) || verticalByKey(kind).spot;
  if (!name || !review) fail("/admin/new", new Error("Escribe el nombre y el enlace de reseñas de Google."));
  // The "before": how many reviews and stars the venue has in Google today. Without it,
  // there is nothing to show the owner at renewal. Read from Google when possible.
  const placeId = placeIdFrom(str(f, "place_id", 300)) ?? placeIdFrom(review);
  const startRaw = str(f, "reviews_start", 7);
  const startReviews = startRaw === "" ? null : Math.round(Number(startRaw));
  const startRatingRaw = str(f, "rating_start", 4).replace(",", ".");
  const startRating = startRatingRaw ? Math.round(Number(startRatingRaw) * 10) / 10 : null;
  const autoBaseline = startReviews === null && placeId && placesReady();
  if (!autoBaseline && (startReviews === null || !(startReviews >= 0))) fail("/admin/new", new Error("Anota cuántas reseñas tiene hoy en Google (el “antes”). Míralo en Google Maps: es el número entre paréntesis junto a las estrellas."));
  if (startRating !== null && !(startRating >= 1 && startRating <= 5)) fail("/admin/new", new Error("Las estrellas van de 1 a 5 (ej. 4.3)."));

  let id: string;
  try {
    const slug = `${slugify(name)}-${newCode(4)}`;
    const logo_url = await uploadLogo(f.get("logo"), slug);
    const { data, error } = await db()
      .from("businesses")
      .insert({
        slug,
        name,
        kind,
        logo_url,
        brand_color: safeColor(str(f, "brand_color")),
        google_review_url: reviewUrlFrom(review),
        google_place_id: placeId,
        manager_email: email(opt(f, "manager_email", 120)),
        manager_name: opt(f, "manager_name", 80),
        manager_phone: phone(opt(f, "manager_phone", 30)),
        billing_name: opt(f, "billing_name", 80),
        billing_phone: phone(opt(f, "billing_phone", 30), "de quien paga"),
        billing_email: email(opt(f, "billing_email", 120)),
        setup_fee: num(f, "setup_fee", 0),
        monthly_fee: fee,
        plan_key: plan?.key ?? null,
        // Without FiveTap Business the plaque goes straight to Google.
        mode: noApp || str(f, "mode", 10) === "google" ? "google" : "full",
        status: isTest ? "trial" : "active",
        trial_ends_at: isTest ? addDays(todayPanama(), TEST_ACTIVE_DAYS - 1) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
    await createTags(id, spotLabel, spots, 1, "table");
    await createTags(id, "Mesero", cards, 1, "waiter");
    if (autoBaseline) await snapshotFromGoogle(id, placeId!, todayPanama());
    else await addReviewSnapshot({ business_id: id, taken_on: todayPanama(), reviews: startReviews!, rating: startRating });
    // Came from a self sign-up on /empezar: mark it as handled.
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
      google_place_id: placeIdFrom(str(f, "place_id", 300)) ?? placeIdFrom(str(f, "review", 500)),
      manager_email: email(opt(f, "manager_email", 120)),
      manager_name: opt(f, "manager_name", 80),
      manager_phone: phone(opt(f, "manager_phone", 30)),
      billing_name: opt(f, "billing_name", 80),
      billing_phone: phone(opt(f, "billing_phone", 30), "de quien paga"),
      billing_email: email(opt(f, "billing_email", 120)),
      status: str(f, "status", 20),
      setup_fee: num(f, "setup_fee", 0),
      monthly_fee: str(f, "plan_key", 30).startsWith("test") ? 0 : str(f, "monthly_fee") === "" ? (await planByKey(str(f, "plan_key", 30)))?.monthly ?? 129 : num(f, "monthly_fee", 129),
      plan_key: (await planByKey(str(f, "plan_key", 30)))?.key ?? null,
      mode: str(f, "mode", 10) === "google" ? "google" : "full",
      trial_ends_at: opt(f, "trial_ends_at", 10),
      notes: opt(f, "notes", 2000),
    };
    if (!patch.name || !str(f, "review")) throw new Error("Nombre y Google son obligatorios.");
    // FiveTap Test ↔ plan: picking a plan ends the test (active); picking Test starts 7 days.
    if (str(f, "plan_key", 30).startsWith("test")) {
      patch.mode = str(f, "plan_key", 30) === "test-google" ? "google" : "full";
      patch.status = "trial";
      if (!patch.trial_ends_at) patch.trial_ends_at = addDays(todayPanama(), TEST_ACTIVE_DAYS - 1);
    } else {
      // A real plan always comes with FiveTap Business.
      if (patch.plan_key) patch.mode = "full";
      if (patch.status === "trial") {
        patch.status = "active";
        patch.trial_ends_at = null;
      }
    }
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
    const kind = str(f, "kind", 10) === "waiter" ? "waiter" : "table";
    const label = str(f, "label", 30) || (kind === "waiter" ? "Mesero" : "Mesa");
    const count = Math.min(Math.max(Math.round(num(f, "count", 1)), 1), 80);
    const { count: existing, error } = await db()
      .from("tags")
      .select("id", { count: "exact", head: true })
      .eq("business_id", id)
      .like("label", `${label}%`);
    if (error) throw new Error(error.message);
    await createTags(id, label, count, (existing ?? 0) + 1, kind);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=placas`);
}

export async function setTagActive(f: FormData) {
  const id = str(f, "business_id", 60);
  const tagId = str(f, "tag_id", 60);
  const on = str(f, "active") === "1";
  try {
    const { data: t, error } = await db().from("tags").select("label, status").eq("id", tagId).single();
    if (error) throw new Error(error.message);
    // A piece the client already has is retired from Placas, with a confirmation.
    if (!on && t.status === "delivered") throw new Error(`“${t.label}” está entregada a un cliente. Para quitarla, usa Retirar en Placas.`);
    const patch = on && t.status === "retired" ? { active: true, status: "delivered", retired_at: null } : { active: on };
    const up = await db().from("tags").update(patch).eq("id", tagId);
    if (up.error) throw new Error(up.error.message);
    await audit(on ? "tag.activated" : "tag.deactivated", { businessId: id, entity: "tag", entityId: tagId, details: { label: t.label } });
  } catch (e) {
    fail(`/admin/b/${id}`, e);
  }
  revalidatePath(`/admin/b/${id}`);
  revalidatePath("/admin/placas");
}

const TAG_STATUS = ["written", "delivered", "retired"] as const;
const STATUS_WORD = { written: "Grabada", delivered: "Entregada", retired: "Retirada" } as const;

/** Moves a piece along created → written → delivered → retired, and keeps the date. */
export async function setTagStatus(f: FormData) {
  const tagId = str(f, "tag_id", 60);
  const back = str(f, "back", 300).startsWith("/admin") ? str(f, "back", 300) : "/admin/placas";
  const to = TAG_STATUS.find((x) => x === str(f, "status", 12));
  try {
    if (!to) throw new Error("Estado no válido.");
    const { data: t, error } = await db().from("tags").select("label, status, business_id, written_at").eq("id", tagId).single();
    if (error) throw new Error(error.message);
    if (to === "retired" && t.status === "delivered" && str(f, "confirm") !== "1") throw new Error("Confirma que retiraste la pieza: su enlace dejará de funcionar.");
    const now = new Date().toISOString();
    const patch =
      to === "written" ? { status: to, written_at: now, active: true }
      : to === "delivered" ? { status: to, delivered_at: now, written_at: t.written_at ?? now, active: true, retired_at: null }
      : { status: to, retired_at: now, active: false };
    const up = await db().from("tags").update(patch).eq("id", tagId);
    if (up.error) throw new Error(up.error.message);
    await audit("tag.status", { businessId: t.business_id, entity: "tag", entityId: tagId, details: { label: t.label, from: t.status, to } });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath("/admin/placas");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent(STATUS_WORD[to!] ?? "guardado")}`);
}

/** The founder's name and note for a piece. Never touches the link written on the chip. */
export async function saveTagInfo(f: FormData) {
  const tagId = str(f, "tag_id", 60);
  const back = str(f, "back", 300).startsWith("/admin") ? str(f, "back", 300) : "/admin/placas";
  try {
    const label = str(f, "label", 60);
    if (!label) throw new Error("Ponle un nombre a la pieza.");
    const note = opt(f, "note", 500);
    const { data: t, error } = await db().from("tags").select("label, note, business_id").eq("id", tagId).single();
    if (error) throw new Error(error.message);
    const up = await db().from("tags").update({ label, note }).eq("id", tagId);
    if (up.error) throw new Error(up.error.message);
    if (t.label !== label) await audit("tag.renamed", { businessId: t.business_id, entity: "tag", entityId: tagId, details: { from: t.label, to: label } });
    if ((t.note ?? null) !== note) await audit("tag.note", { businessId: t.business_id, entity: "tag", entityId: tagId, details: { label } });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath("/admin/placas");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=guardado`);
}

const METHODS = ["paypal", "card", "ach", "yappy", "cash", "other"] as const;
const KINDS = ["setup", "monthly", "annual", "pieces", "other"] as const;

/**
 * Registers a payment that already arrived, then issues its receipt and (if asked) sends
 * it to the owner by email and in FiveTap Business. A double submit is ignored thanks to
 * the form's one-time key; the receipt is one per payment.
 */
export async function recordPayment(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  let result = "pago";
  let receiptNumber = "";
  try {
    const amount = Math.round(num(f, "amount", 0) * 100) / 100;
    if (!(amount > 0)) throw new Error("Monto inválido.");
    // "m:<label>" is a method added by the founder; it is saved as "other" with its name.
    const rawMethod = str(f, "method", 80);
    const custom = rawMethod.startsWith("m:") ? rawMethod.slice(2).trim() : "";
    const method = custom ? "other" : (METHODS as readonly string[]).includes(rawMethod) ? rawMethod : "";
    if (!method || (method === "other" && !custom && !str(f, "method_other", 40))) throw new Error("Elige el método de pago.");
    const kind = (KINDS as readonly string[]).includes(str(f, "kind", 10)) ? str(f, "kind", 10) : "";
    if (!kind) throw new Error("Elige el concepto del pago.");
    if (str(f, "confirm", 3) !== "1") throw new Error("Confirma que el pago ya llegó antes de registrarlo.");
    const key = str(f, "idempotency_key", 60) || null;

    const { data: before, error: bizError } = await db().from("businesses").select("*").eq("id", id).maybeSingle();
    if (bizError || !before) throw new Error(bizError?.message ?? "Negocio no encontrado.");
    const wasPaused = (await billingOf(before)).kind === "suspended";

    const ins = await db().from("payments").insert({
      business_id: id,
      // Kept on the payment so the record still says whose it was if the venue is deleted.
      business_name: before.name,
      amount,
      kind,
      method,
      method_label: method === "other" ? custom || str(f, "method_other", 40) : null,
      reference: opt(f, "reference", 120),
      // The database default is the UTC date; at night in Panamá that is already tomorrow.
      paid_at: todayPanama(),
      idempotency_key: key,
    }).select("id").single();
    if (ins.error) {
      // Same form sent twice: the first one already did everything.
      if (key && ins.error.code === "23505") redirect(`${back}?ok=pago#pagos`);
      throw new Error(ins.error.message);
    }
    // First payment turns a trial into a paying customer; extra days given are no longer needed.
    await db().from("businesses").update({ status: "active" }).eq("id", id).eq("status", "trial");
    await db().from("businesses").update({ grace_until: null }).eq("id", id);
    await audit("payment.recorded", { businessId: id, entity: "payment", entityId: ins.data.id, details: { amount, kind, method, method_label: custom || null, reference: opt(f, "reference", 120) } });

    const reactivated = wasPaused && !(await billingOf({ ...before, grace_until: null })).blocked;
    const receipt = await issueReceipt(ins.data.id);
    receiptNumber = receipt.number;
    const send = str(f, "send", 3) === "1";
    if (send) {
      const out = await deliverReceipt(receipt, { email: true, push: true, ownerToken: before.owner_token, reactivated });
      result = out.email?.status === "sent" ? "comprobante-correo" : "comprobante-app";
    } else if (reactivated) {
      await sendPush({ role: "owner", businessId: id }, { title: `¡Listo, ${before.name}!`, body: "Recibimos tu pago. Tus placas ya funcionan otra vez. ¡Gracias! 🙌", url: `/mi/${before.owner_token}` }).catch(() => 0);
    }
    if (reactivated) result += "-reactivado";
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect()
    fail(back, e);
  }
  revalidatePath(back);
  revalidatePath("/admin/cobros");
  revalidatePath("/admin/comprobantes");
  redirect(`${back}?ok=${result}&r=${encodeURIComponent(receiptNumber)}#pagos`);
}

/**
 * Sends a receipt by WhatsApp. With the official Cloud API configured it goes out from here and
 * Meta's answer is recorded; otherwise WhatsApp opens with the message ready and the panel
 * records "opened" (the founder still taps Send).
 */
export async function sendReceiptWhatsApp(f: FormData) {
  const rid = str(f, "receipt_id", 60);
  const back = str(f, "back", 160).startsWith("/admin") ? str(f, "back", 160) : "/admin/comprobantes";
  let target = "";
  try {
    const { data: r, error } = await db().from("receipts").select("*").eq("id", rid).maybeSingle();
    if (error || !r) throw new Error(error?.message ?? "Recibo no encontrado.");
    if (r.status !== "paid") throw new Error("Un recibo anulado no se envía.");
    const b = r.business_id ? (await db().from("businesses").select("billing_phone, manager_phone").eq("id", r.business_id).maybeSingle()).data : null;
    const phone = b?.billing_phone || b?.manager_phone;
    if (!phone) throw new Error("Este negocio no tiene WhatsApp registrado. Agrégalo en Editar datos.");
    const first = r.owner_name ? r.owner_name.split(" ")[0] : "";
    const url = receiptUrl(r);
    if (whatsappApiReady()) {
      const out = await sendWhatsAppTemplate(phone, [first || r.venue_name, r.number, receiptMoney(r.amount), url]);
      await logSend(r.id, "whatsapp", phone, out);
      await audit("receipt.sent", { businessId: r.business_id, entity: "receipt", entityId: r.number, details: { whatsapp: out.status } });
      if (out.status !== "sent") throw new Error(`WhatsApp no lo envió: ${out.detail}`);
      const [path, hash] = back.split("#");
      target = `${path}${path!.includes("?") ? "&" : "?"}ok=wa-enviado${hash ? `#${hash}` : ""}`;
    } else {
      const text = `Hola${first ? ` ${first}` : ""}, te escribe FiveTap. Recibimos tu pago de ${receiptMoney(r.amount)} (${r.concept}). Tu recibo ${r.number} está aquí: ${url}\n\n¡Gracias por confiar en FiveTap!`;
      await logSend(r.id, "whatsapp", phone, { status: "opened", detail: "Se abrió WhatsApp con el recibo listo; el envío se confirma en WhatsApp." });
      await audit("receipt.sent", { businessId: r.business_id, entity: "receipt", entityId: r.number, details: { whatsapp: "opened" } });
      target = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }
  } catch (e) {
    fail(back, e);
  }
  revalidatePath("/admin/comprobantes");
  redirect(target);
}

const PRODUCTS = Object.keys(PLAN_TEST_PRODUCTS) as PlanTestProduct[];

/** Plan Test: a one-time sale of single pieces. Registers it and, if already paid, issues its receipt. */
export async function createOrder(f: FormData) {
  const back = "/admin/contratos";
  let ok = "compra";
  try {
    const businessId = str(f, "business_id", 60);
    const product = PRODUCTS.find((p) => p === str(f, "product", 10));
    if (!product) throw new Error("Elige el producto.");
    const quantity = Math.round(num(f, "quantity", 0));
    if (!(quantity >= 1 && quantity <= 500)) throw new Error("La cantidad va de 1 a 500.");
    const unit = Math.round(num(f, "unit_price", PLAN_TEST_PRODUCTS[product].unit) * 100) / 100;
    if (!(unit > 0)) throw new Error("Precio unitario inválido.");
    const rawMethod = str(f, "method", 80);
    const custom = rawMethod.startsWith("m:") ? rawMethod.slice(2).trim() : "";
    const method = custom ? "other" : (METHODS as readonly string[]).includes(rawMethod) ? rawMethod : "";
    if (!method || (method === "other" && !custom && !str(f, "method_other", 40))) throw new Error("Elige el método de pago.");
    const purchased = /^\d{4}-\d{2}-\d{2}$/.test(str(f, "purchased_on", 10)) ? str(f, "purchased_on", 10) : todayPanama();
    const { data: b, error: be } = await db().from("businesses").select("id, name").eq("id", businessId).maybeSingle();
    if (be || !b) throw new Error("Elige el negocio. Si es nuevo, créalo primero en Nuevo negocio con el plan Personalizado.");
    const paid = str(f, "pay_status", 10) === "paid";
    const { data: order, error } = await db().from("orders").insert({
      business_id: b.id,
      business_name: b.name,
      customer_name: opt(f, "customer_name", 100),
      product,
      quantity,
      unit_price: unit,
      // Always computed here: quantity × unit price, never typed.
      total: Math.round(quantity * unit * 100) / 100,
      purchased_on: purchased,
      method,
      method_label: method === "other" ? custom || str(f, "method_other", 40) : null,
      pay_status: "pending",
      notes: opt(f, "notes", 500),
    }).select("id, number").single();
    if (error) throw new Error(error.message);
    await audit("order.created", { businessId: b.id, entity: "order", entityId: order.number, details: { product, quantity, unit, total: quantity * unit } });
    // The pieces appear in the inventory (Placas) ready to be written and delivered.
    if (str(f, "create_pieces", 3) === "1") {
      const p = PLAN_TEST_PRODUCTS[product];
      const { count } = await db().from("tags").select("id", { count: "exact", head: true }).eq("business_id", b.id).like("label", `${p.label}%`);
      await createTags(b.id, p.label, quantity, (count ?? 0) + 1, p.kind);
    }
    if (paid) ok = await payOrderNow(order.id, str(f, "send", 3) === "1");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    fail(back, e);
  }
  revalidatePath(back);
  revalidatePath("/admin/comprobantes");
  redirect(`${back}?ok=${ok}#plan-test`);
}

/** A pending Plan Test purchase was paid: payment, receipt and (optionally) its delivery. */
export async function payOrder(f: FormData) {
  const back = "/admin/contratos";
  let ok = "compra-pagada";
  try {
    if (str(f, "confirm", 3) !== "1") throw new Error("Confirma que el pago ya llegó.");
    ok = await payOrderNow(str(f, "order_id", 60), str(f, "send", 3) === "1");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    fail(back, e);
  }
  revalidatePath(back);
  revalidatePath("/admin/comprobantes");
  redirect(`${back}?ok=${ok}#plan-test`);
}

async function payOrderNow(orderId: string, send: boolean): Promise<string> {
  const { data: o, error } = await db().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !o) throw new Error(error?.message ?? "Compra no encontrada.");
  if (o.pay_status === "void") throw new Error("Esta compra está anulada.");
  if (!o.business_id) throw new Error("El negocio de esta compra ya no existe.");
  let paymentId: string | null = o.payment_id;
  if (!paymentId) {
    // One payment per purchase, even if the button is pressed twice.
    const key = `order-${o.id}`;
    const ins = await db().from("payments").insert({
      business_id: o.business_id,
      business_name: o.business_name,
      amount: Number(o.total),
      kind: "pieces",
      method: o.method,
      method_label: o.method_label,
      paid_at: o.purchased_on,
      idempotency_key: key,
    }).select("id").single();
    if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
    paymentId = ins.data?.id ?? (await db().from("payments").select("id").eq("idempotency_key", key).single()).data?.id ?? null;
    if (!paymentId) throw new Error("No se pudo registrar el pago.");
    const up = await db().from("orders").update({ payment_id: paymentId, pay_status: "paid" }).eq("id", o.id);
    if (up.error) throw new Error(up.error.message);
    await audit("payment.recorded", { businessId: o.business_id, entity: "payment", entityId: paymentId, details: { amount: Number(o.total), kind: "pieces", method: o.method, order: o.number } });
  }
  const receipt = await issueReceipt(paymentId);
  if (!send) return "compra-pagada";
  const token = (await db().from("businesses").select("owner_token").eq("id", o.business_id).maybeSingle()).data?.owner_token;
  const out = await deliverReceipt(receipt, { email: true, push: true, ownerToken: token });
  return out.email?.status === "sent" ? "comprobante-correo" : "comprobante-app";
}

/** Sends an existing receipt again (email and app). The receipt and its number stay the same. */
export async function resendReceipt(f: FormData) {
  const rid = str(f, "receipt_id", 60);
  const back = str(f, "back", 160).startsWith("/admin") ? str(f, "back", 160) : "/admin/comprobantes";
  let ok = "reenviado";
  try {
    const { data: r, error } = await db().from("receipts").select("*").eq("id", rid).maybeSingle();
    if (error || !r) throw new Error(error?.message ?? "Comprobante no encontrado.");
    const token = r.business_id ? (await db().from("businesses").select("owner_token").eq("id", r.business_id).maybeSingle()).data?.owner_token : undefined;
    const out = await deliverReceipt(r, { email: str(f, "email", 3) !== "0", push: str(f, "push", 3) !== "0", ownerToken: token });
    if (out.email && out.email.status !== "sent") ok = "reenviado-sin-correo";
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back.split("?")[0]!.split("#")[0]!);
  revalidatePath("/admin/comprobantes");
  redirect(`${back.split("#")[0]}${back.includes("?") ? "&" : "?"}ok=${ok}`);
}

/**
 * Fixes a payment registered by mistake: the receipt stays, marked void with the reason,
 * the payment stops counting (dates and status recalculate) and everything is audited.
 * Then the right payment is registered again, with a new receipt.
 */
export async function voidPayment(f: FormData) {
  const id = str(f, "business_id", 60);
  const pid = str(f, "payment_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const reason = str(f, "reason", 200);
    if (reason.length < 4) throw new Error("Escribe el motivo de la anulación.");
    const { data: pay, error } = await db().from("payments").select("*").eq("id", pid).eq("business_id", id).maybeSingle();
    if (error || !pay) throw new Error(error?.message ?? "Pago no encontrado.");
    const { data: r } = await db().from("receipts").select("id, number").eq("payment_id", pid).maybeSingle();
    if (r) {
      const upd = await db().from("receipts").update({ status: "void", void_reason: reason, voided_at: new Date().toISOString() }).eq("id", r.id);
      if (upd.error) throw new Error(upd.error.message);
    }
    const del = await db().from("payments").delete().eq("id", pid);
    if (del.error) throw new Error(del.error.message);
    await audit("payment.voided", { businessId: id, entity: "payment", entityId: pid, details: { reason, amount: pay.amount, kind: pay.kind, method: pay.method, method_label: pay.method_label, paid_at: pay.paid_at, receipt: r?.number ?? null } });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  revalidatePath("/admin/comprobantes");
  redirect(`${back}?ok=anulado#pagos`);
}

/** Receipt for a payment registered before receipts existed (issued only, not sent). */
export async function emitReceipt(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  let number = "";
  try {
    const { data: pay } = await db().from("payments").select("id").eq("id", str(f, "payment_id", 60)).eq("business_id", id).maybeSingle();
    if (!pay) throw new Error("Pago no encontrado.");
    number = (await issueReceipt(pay.id)).number;
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=comprobante-emitido&r=${encodeURIComponent(number)}#pagos`);
}

/** A payment method of the founder's own (e.g. "Nequi"), offered when registering payments. */
export async function addPaymentMethod(f: FormData) {
  const label = str(f, "label", 40);
  try {
    if (label.length < 2) throw new Error("Escribe el nombre del método.");
    const { error } = await db().from("payment_methods").insert({ label });
    if (error) throw new Error(error.code === "23505" ? "Ese método ya existe." : error.message);
    await audit("method.added", { entity: "payment_method", entityId: label });
  } catch (e) {
    fail("/admin/comprobantes", e);
  }
  revalidatePath("/admin/comprobantes");
  redirect("/admin/comprobantes?ok=metodo#metodos");
}

export async function removePaymentMethod(f: FormData) {
  const mid = str(f, "id", 60);
  const { data } = await db().from("payment_methods").delete().eq("id", mid).select("label").maybeSingle();
  if (data) await audit("method.removed", { entity: "payment_method", entityId: data.label });
  revalidatePath("/admin/comprobantes");
  redirect("/admin/comprobantes?ok=metodo#metodos");
}

/** A few more days before the automatic pause (the owner promised to pay). */
export async function extendGrace(f: FormData) {
  const id = str(f, "business_id", 60);
  const days = Math.min(Math.max(Math.round(num(f, "days", 7)), 1), 30);
  const back = str(f, "back", 120).startsWith("/admin") ? str(f, "back", 120) : `/admin/b/${id}`;
  try {
    const { data: b, error } = await db().from("businesses").select("*").eq("id", id).maybeSingle();
    if (error || !b) throw new Error(error?.message ?? "Negocio no encontrado.");
    const billing = await billingOf(b);
    const today = todayPanama();
    // Counted from today, or from the current last day if that is later.
    const from = billing.suspendsOn && addDays(billing.suspendsOn, -1) > today ? addDays(billing.suspendsOn, -1) : today;
    const { error: upd } = await db().from("businesses").update({ grace_until: addDays(from, days) }).eq("id", id);
    if (upd) throw new Error(upd.message);
    await audit("grace.extended", { businessId: id, entity: "business", entityId: id, details: { days, until: addDays(from, days) } });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(`/admin/b/${id}`);
  revalidatePath("/admin/cobros");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=plazo`);
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

/** Reads today's review count and stars straight from Google (needs the Place ID and the API key). */
export async function countFromGoogle(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const { data, error } = await db().from("businesses").select("google_place_id").eq("id", id).single();
    if (error) throw new Error(error.message);
    if (!data.google_place_id) throw new Error("Este negocio no tiene Place ID. Agrégalo en Editar datos.");
    await snapshotFromGoogle(id, data.google_place_id, todayPanama());
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
/** A new access code for the owner or the manager; phones that used the old one ask again. */
export async function renewAccessCode(f: FormData) {
  const id = str(f, "business_id", 60);
  const back = `/admin/b/${id}`;
  try {
    const { data, error } = await db().from("businesses").select("id, owner_token, owner_code_enc, manager_code_enc").eq("id", id).single();
    if (error) throw new Error(error.message);
    await renewCode(data, str(f, "role", 10) === "owner" ? "owner" : "manager");
    await audit("access.code_renewed", { businessId: id, entity: "business", entityId: id, details: { role: str(f, "role", 10) } });
  } catch (e) {
    fail(back, e);
  }
  revalidatePath(back);
  redirect(`${back}?ok=guardado#app`);
}

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

/** An online payment from /pagar is now recorded in its business: drop it from the Agenda. */
export async function markWebPaymentHandled(f: FormData) {
  const id = str(f, "id", 60);
  if (/^[0-9a-f-]{36}$/i.test(id)) await db().from("web_payments").update({ handled: true }).eq("id", id);
  revalidatePath("/admin/agenda");
}

export async function renameTag(f: FormData) {
  const id = str(f, "business_id", 60);
  const tagId = str(f, "tag_id", 60);
  const label = str(f, "label", 60);
  if (label) {
    const { data: t } = await db().from("tags").select("label").eq("id", tagId).maybeSingle();
    const { error } = await db().from("tags").update({ label }).eq("id", tagId);
    if (error) fail(`/admin/b/${id}`, new Error(error.message));
    if (t && t.label !== label) await audit("tag.renamed", { businessId: id, entity: "tag", entityId: tagId, details: { from: t.label, to: label } });
  }
  revalidatePath(`/admin/b/${id}`);
  revalidatePath("/admin/placas");
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
    const { data: b, error } = await db().from("businesses").select("name, logo_url, kind, plan_key, google_review_url, google_place_id, manager_name, manager_phone, manager_email, billing_name, billing_phone, billing_email").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Error("El negocio no existe.");
    if (str(f, "confirm", 80).trim() !== b.name) throw new Error("Escribe el nombre exacto del negocio para eliminarlo.");
    // Pieces a client has stop working: the founder must say so explicitly in the second step.
    const { count: delivered } = await db().from("tags").select("id", { count: "exact", head: true }).eq("business_id", id).eq("status", "delivered");
    if (delivered && f.get("retire_delivered") !== "1") throw new Error(`Tiene ${delivered} ${delivered === 1 ? "pieza entregada" : "piezas entregadas"} en el local. Marca que entiendes que dejarán de funcionar para eliminarlo.`);
    const count = async (t: string) => (await db().from(t).select("id", { count: "exact", head: true }).eq("business_id", id)).count ?? 0;
    const [pieces, payments, receipts, orders] = await Promise.all([count("tags"), count("payments"), count("receipts"), count("orders")]);
    // Payments, receipts, orders and contracts keep the business name (FK on delete set null);
    // pieces, taps, messages, club, review counts and app access go with the business (cascade).
    const del = await db().from("businesses").delete().eq("id", id);
    if (del.error) throw new Error(del.error.message);
    await audit("business.deleted", { businessId: id, entity: "business", entityId: b.name, details: { name: b.name, pieces, delivered: delivered ?? 0, kept_payments: payments, kept_receipts: receipts, kept_orders: orders,
      // What "Volver a crearlo" fills in; the logo and the pieces are not kept.
      redo: { name: b.name, kind: b.kind, plan_key: b.plan_key, google_review_url: b.google_review_url, google_place_id: b.google_place_id, manager_name: b.manager_name, manager_phone: b.manager_phone, manager_email: b.manager_email, billing_name: b.billing_name, billing_phone: b.billing_phone, billing_email: b.billing_email } } });
    const logo = b.logo_url?.split("/logos/")[1];
    if (logo) await db().storage.from("logos").remove([decodeURIComponent(logo)]);
  } catch (e) {
    fail(back, e);
  }
  revalidatePath("/admin");
  redirect(`/admin?ok=eliminado&rehacer=${id}#negocios`);
}

/**
 * Edits one of the commercial plans (Planes): price, pieces, what it includes and its
 * PayPal plan. Venues already on it keep their own price; the website updates at once.
 */
export async function updatePlan(f: FormData) {
  const key = str(f, "key", 30);
  try {
    const before = await planByKey(key);
    if (!before) throw new Error("Plan no encontrado.");
    const int = (k: string, max: number) => Math.min(Math.max(Math.round(num(f, k, 0)), 0), max);
    const paypal = str(f, "paypal_plan", 40);
    if (paypal && !/^P-[A-Z0-9]{10,40}$/.test(paypal)) throw new Error("El ID de PayPal empieza con P- (ej. P-75J01261M17162054NLZLRPI).");
    const patch = {
      name: str(f, "name", 40) || before.name,
      monthly: Math.round(num(f, "monthly", before.monthly) * 100) / 100,
      plaques: int("plaques", 200),
      cards: int("cards", 100),
      lanyards: int("lanyards", 100),
      badge: opt(f, "badge", 30),
      badge_color: (["neutral", "blue", "purple", "gold"] as const).find((c) => c === str(f, "badge_color", 10)) ?? "neutral",
      features: String(f.get("features") ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((l) => l.slice(0, 90)),
      paypal_plan: paypal || null,
      active: str(f, "active", 3) === "1",
      updated_at: new Date().toISOString(),
    };
    const { error } = await db().from("plans").update(patch).eq("key", key);
    if (error) throw new Error(error.message);
    await audit("plan.updated", { entity: "plan", entityId: key, details: { from: { monthly: before.monthly, plaques: before.plaques, cards: before.cards, paypal_plan: before.paypal_plan }, to: { monthly: patch.monthly, plaques: patch.plaques, cards: patch.cards, paypal_plan: patch.paypal_plan } } });
  } catch (e) {
    fail("/admin/planes", e);
  }
  revalidateTag(PLANS_TAG);
  for (const p of ["/", "/empezar", "/pagar", "/terminos", "/admin/planes"]) revalidatePath(p);
  redirect(`/admin/planes?ok=plan#${key}`);
}

/**
 * A 3-month contract for a venue, filled from its business: plan, price and the plaques
 * and waiter cards it has. Only the signer, start date and payment method are typed.
 */
export async function createAgreement(f: FormData) {
  const bid = str(f, "business_id", 60);
  let id = "";
  try {
    const { data: b, error } = await db().from("businesses").select("*").eq("id", bid).maybeSingle();
    if (error || !b) throw new Error(error?.message ?? "Elige el negocio.");
    const signer = str(f, "signer_name", 100);
    if (signer.length < 3) throw new Error("Escribe el nombre de quien firma por el local.");
    const start = /^\d{4}-\d{2}-\d{2}$/.test(str(f, "start_date", 10)) ? str(f, "start_date", 10) : todayPanama();
    const method = (AGREEMENT_METHODS as readonly string[]).includes(str(f, "payment_method", 60)) ? str(f, "payment_method", 60) : AGREEMENT_METHODS[0];
    const role = (SIGNER_ROLES as readonly string[]).includes(str(f, "signer_role", 40)) ? str(f, "signer_role", 40) : SIGNER_ROLES[0];
    const [{ data: tags }, plans] = await Promise.all([db().from("tags").select("kind, active").eq("business_id", bid), getPlans()]);
    const active = ((tags ?? []) as { kind: string; active: boolean }[]).filter((t) => t.active);
    const plan = planOf(b, plans);
    const cards = active.filter((t) => t.kind === "waiter").length;
    const ins = await db().from("agreements").insert({
      business_id: bid,
      venue_name: b.name,
      venue_address: opt(f, "venue_address", 160),
      signer_name: signer,
      signer_role: role,
      plan_name: plan?.name ?? "Plan FiveTap personalizado",
      monthly_fee: Number(b.monthly_fee),
      plaques: active.filter((t) => t.kind !== "waiter").length,
      cards,
      lanyards: cards, // one lanyard per waiter card
      start_date: start,
      end_date: endOf(start),
      payment_method: method,
    }).select("id, number").single();
    if (ins.error) throw new Error(ins.error.message);
    id = ins.data.id;
    await audit("contract.created", { businessId: bid, entity: "contract", entityId: ins.data.number, details: { start, monthly: b.monthly_fee } });
  } catch (e) {
    fail(`/admin/contratos${bid ? `?b=${bid}` : ""}`, e);
  }
  revalidatePath("/admin/contratos");
  revalidatePath(`/admin/b/${bid}`);
  redirect(`/admin/contratos?ok=contrato&c=${id}`);
}

/** Removes a contract created by mistake (the action stays in the audit log). */
export async function deleteAgreement(f: FormData) {
  const aid = str(f, "id", 60);
  const { data } = await db().from("agreements").delete().eq("id", aid).select("number, business_id, venue_name").maybeSingle();
  if (data) await audit("contract.deleted", { businessId: data.business_id, entity: "contract", entityId: data.number, details: { venue: data.venue_name } });
  revalidatePath("/admin/contratos");
  if (data?.business_id) revalidatePath(`/admin/b/${data.business_id}`);
  redirect("/admin/contratos?ok=contrato-borrado");
}
