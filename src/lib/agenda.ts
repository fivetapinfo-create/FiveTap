import "server-only";
import { createHash } from "node:crypto";
import { db } from "./supabase";
import { SITE_URL } from "./site";
import { TEST_OFFER } from "./test-kit";
import { type Plan, getPlans, planOf } from "./plans";
import type { Business, Payment } from "./types";

// The founder's to-do list, computed from the data every time: payments to
// collect, trials ending, annual renewals, reports, contracts to prepare and
// unread complaints. Each task can carry a ready-to-send WhatsApp message.

export type TaskKind = "cobro" | "recordatorio" | "prueba" | "renovacion" | "reporte" | "contrato" | "mensajes" | "instalacion" | "animo" | "cancelacion" | "registro" | "pagoweb";

export type Task = {
  id: string;
  kind: TaskKind;
  date: string; // YYYY-MM-DD (Panamá)
  title: string;
  detail: string;
  businessId?: string;
  /** wa.me link with the message already written, when we have the owner's WhatsApp. */
  whatsapp?: string;
  /** Day the payment falls due, for charges and reminders. */
  due?: string;
  /** A page in the panel to act on the task (e.g. create the business from a sign-up). */
  link?: { href: string; label: string };
  /** An online payment to mark as registered once it's recorded in the business. */
  webPaymentId?: string;
  /** Notification for whoever pays, sent by the daily cron to their FiveTap app. */
  push?: { title: string; body: string; url: string };
};

const DAY = 86_400_000;
const PANAMA_OFFSET = 5 * 3600_000;

export const todayPanama = () => new Date(Date.now() - PANAMA_OFFSET).toISOString().slice(0, 10);

export function addDays(iso: string, n: number) {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1 + n, 1, 12));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).getUTCDate();
  t.setUTCDate(Math.min(d!, last));
  return t.toISOString().slice(0, 10);
}

/** Calendar day in Panamá of a date ("2026-10-02") or a timestamp. */
const localDate = (iso: string) => (iso.length === 10 ? iso : new Date(Date.parse(iso) - PANAMA_OFFSET).toISOString().slice(0, 10));
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const human = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m! - 1]}`;
};
const money = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const wa = (phone: string | null, text: string) => (phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : undefined);
const first = (name: string | null) => (name ? ` ${name.split(" ")[0]}` : "");

/** Short, warm messages for the owners. One per week, the same for everyone that week. */
export const CHEERS = [
  "¡Feliz inicio de semana! Que tu local se llene de buenas mesas y mejores reseñas. 🍽️⭐",
  "¡Mucho éxito esta semana! Cada cliente feliz es una nueva estrella para tu negocio. ✨",
  "¡Arrancamos semana! Recuerda: tus meseros son tus mejores aliados para las reseñas. 💪",
  "¡Que tengas una semana llena de clientes felices! Seguimos trabajando para ti. 🙌",
  "¡Buena semana! Un detalle pequeño hoy es una reseña de 5 estrellas mañana. 🌟",
  "¡Éxitos esta semana! Si algo no salió bien con un cliente, el mensaje privado te avisa a tiempo. 🔔",
  "¡Feliz semana! Gracias por confiar en FiveTap. Vamos por más reseñas juntos. 🚀",
  "¡Que sea una gran semana para tu equipo! Un cliente bien atendido siempre vuelve. 😊",
];

export function cheerOfTheWeek(today = todayPanama()) {
  const week = Math.floor(Date.parse(`${today}T12:00:00Z`) / (7 * DAY));
  return CHEERS[week % CHEERS.length]!;
}

/** Secret part of the calendar link: derived from the admin password, so no extra setting. */
export function calendarToken() {
  return createHash("sha256").update(`fivetap-agenda:${process.env.ADMIN_PASSWORD ?? ""}`).digest("hex").slice(0, 32);
}

type BizRow = Pick<Business, "id" | "name" | "status" | "mode" | "monthly_fee" | "trial_ends_at" | "manager_name" | "manager_phone" | "billing_name" | "billing_phone" | "cancel_requested_at" | "cancel_reason" | "created_at" | "grace_until" | "plan_key" | "google_place_id">;
type PayRow = Pick<Payment, "business_id" | "kind" | "method" | "paid_at" | "amount">;

/** Who gets payment reminders: the payer if set, otherwise the manager. */
const payer = (b: Pick<BizRow, "manager_name" | "manager_phone" | "billing_name" | "billing_phone">) =>
  b.billing_phone ? { name: b.billing_name, phone: b.billing_phone } : { name: b.manager_name, phone: b.manager_phone };

/** Owners to greet this week, each with the WhatsApp message ready. */
export async function cheerList(today = todayPanama()) {
  const res = await db().from("businesses").select("id, name, manager_name, manager_phone, billing_name, billing_phone, status, mode, monthly_fee").order("name");
  if (res.error) throw new Error(res.error.message);
  const cheer = cheerOfTheWeek(today);
  return (res.data as BizRow[])
    .filter((b) => b.status !== "canceled" && payer(b).phone)
    .map((b) => ({ id: b.id, name: b.name, whatsapp: wa(payer(b).phone, `Hola${first(payer(b).name)} 👋 ${cheer} — FiveTap`)! }));
}

export type Charge = { due: string; amount: number; label: string; auto: boolean; kind: "trial" | "monthly" | "annual" };

/**
 * Next charge: a month or a year after the last payment. Before any payment, the first one
 * is due when the trial ends or, with no trial, the day the venue was registered.
 */
export function nextCharge(
  b: Pick<Business, "mode" | "monthly_fee" | "trial_ends_at"> & { created_at?: string },
  pays: Pick<Payment, "kind" | "method" | "paid_at" | "amount">[],
): Charge | null {
  const fee = Number(b.monthly_fee);
  if (b.mode !== "full" || fee <= 0) return null;
  const sorted = [...pays].sort((x, y) => x.paid_at.localeCompare(y.paid_at));
  const annual = sorted.findLast((p) => p.kind === "annual");
  const monthly = sorted.findLast((p) => p.kind === "monthly");
  const auto = sorted.at(-1)?.method === "paypal" || sorted.at(-1)?.method === "card";
  if (annual) {
    // The annual plan can be paid in two halves (online + cash): payments within 60 days
    // of the latest one belong to the same year, which starts with the first of them.
    const cycle = sorted.filter((p) => p.kind === "annual" && Date.parse(annual.paid_at) - Date.parse(p.paid_at) <= 60 * DAY);
    const amount = cycle.reduce((sum, p) => sum + Number(p.amount), 0);
    return { due: addMonths(localDate(cycle[0]!.paid_at), 12), amount, label: "renovación anual", auto: false, kind: "annual" };
  }
  if (monthly) return { due: addMonths(localDate(monthly.paid_at), 1), amount: fee, label: "mensualidad", auto, kind: "monthly" };
  if (b.trial_ends_at) return { due: localDate(b.trial_ends_at), amount: fee, label: "mensualidad", auto, kind: "trial" };
  if (b.created_at) return { due: localDate(b.created_at), amount: fee, label: "primer pago", auto: false, kind: "monthly" };
  return null;
}

// ---------- Late payments and automatic pause ----------

/** Days after the due date while everything keeps working. The day after, the service pauses. */
export const GRACE_DAYS = 5;

export type BillingKind = "none" | "trial" | "ended" | "ok" | "soon" | "late" | "suspended" | "paused" | "canceled";

export type Billing = {
  kind: BillingKind;
  charge: Charge | null;
  /** Days since the due date (negative = days left). */
  daysLate: number;
  /** First day the service is paused if the payment is still not registered. */
  suspendsOn: string | null;
  /** Plaques, guest pages and the owner app are closed. */
  blocked: boolean;
};

export const BILLING_LABEL: Record<BillingKind, string> = {
  none: "Sin plan",
  trial: "En prueba",
  ended: "Prueba terminada",
  ok: "Activo",
  soon: "Por vencer",
  late: "Vencido",
  suspended: "Suspendido",
  paused: "Pausado",
  canceled: "Cancelado",
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

/**
 * Where a venue stands with its payments, computed from its payments every time, so
 * registering a payment reactivates everything at once. Nothing is stored or deleted.
 */
export function billingState(
  b: Pick<Business, "status" | "mode" | "monthly_fee" | "trial_ends_at" | "created_at" | "grace_until">,
  pays: Pick<Payment, "kind" | "method" | "paid_at" | "amount">[],
  today = todayPanama(),
): Billing {
  const charge = b.status === "canceled" ? null : nextCharge(b, pays);
  if (b.status === "canceled") return { kind: "canceled", charge, daysLate: 0, suspendsOn: null, blocked: true };
  if (b.status === "paused") return { kind: "paused", charge, daysLate: charge ? daysBetween(charge.due, today) : 0, suspendsOn: null, blocked: true };
  // FiveTap Test: a 7-day test with no monthly fee. The day after its last day it pauses by
  // itself until the venue picks a plan (the founder switches it to a plan in the panel).
  if (b.status === "trial" && b.trial_ends_at && Number(b.monthly_fee) <= 0) {
    const last = localDate(b.trial_ends_at);
    const endsOn = addDays(last, 1);
    return today >= endsOn
      ? { kind: "ended", charge: null, daysLate: daysBetween(last, today), suspendsOn: endsOn, blocked: true }
      : { kind: "trial", charge: null, daysLate: daysBetween(last, today), suspendsOn: endsOn, blocked: false };
  }
  if (!charge) return { kind: "none", charge, daysLate: 0, suspendsOn: null, blocked: false };
  const daysLate = daysBetween(charge.due, today);
  const graceEnd = addDays(charge.due, GRACE_DAYS);
  const lastDay = b.grace_until && b.grace_until > graceEnd ? b.grace_until : graceEnd;
  const suspendsOn = addDays(lastDay, 1);
  if (today >= suspendsOn) return { kind: "suspended", charge, daysLate, suspendsOn, blocked: true };
  return { kind: daysLate > 0 ? "late" : daysLate >= -3 ? "soon" : "ok", charge, daysLate, suspendsOn, blocked: false };
}

/** "FiveTap Pro · 20 placas", for messages about payments. */
export function planLabel(b: { plan_key?: string | null; monthly_fee: number }, charge: Charge | null, plaques: number, plans: Plan[] = []) {
  const plan = planOf(b, plans);
  const name = charge?.kind === "annual" ? "Plan anual" : plan ? plan.name : "Plan mensual";
  return plaques > 0 ? `${name} · ${plaques} ${plaques === 1 ? "placa" : "placas"}` : name;
}

type BillingRow = { business: BizRow & Pick<Business, "grace_until" | "owner_token" | "google_place_id">; billing: Billing; plaques: number };

/** Every venue with its payment status and active plaques, for the panel and the daily job. */
export async function billingAll(today = todayPanama()): Promise<BillingRow[]> {
  const [bizRes, payRes, tagRes] = await Promise.all([
    db().from("businesses").select("id, name, status, mode, monthly_fee, trial_ends_at, manager_name, manager_phone, billing_name, billing_phone, cancel_requested_at, cancel_reason, created_at, grace_until, plan_key, owner_token, google_place_id").order("name"),
    db().from("payments").select("business_id, kind, method, paid_at, amount").order("paid_at"),
    db().from("tags").select("business_id").eq("active", true),
  ]);
  for (const r of [bizRes, payRes, tagRes]) if (r.error) throw new Error(r.error.message);
  const pays = (payRes.data ?? []) as PayRow[];
  const plaques = new Map<string, number>();
  for (const t of (tagRes.data ?? []) as { business_id: string }[]) plaques.set(t.business_id, (plaques.get(t.business_id) ?? 0) + 1);
  return ((bizRes.data ?? []) as BillingRow["business"][]).map((b) => ({
    business: b,
    billing: billingState(b, pays.filter((p) => p.business_id === b.id), today),
    plaques: plaques.get(b.id) ?? 0,
  }));
}

/** Every task from `from` to `to` (inclusive), sorted by date. Overdue charges are pulled to `from`. */
export async function agenda(from: string, to: string): Promise<Task[]> {
  const plans = await getPlans();
  const [bizRes, payRes, conRes, unreadRes, signupRes, webRes, tagRes, agrRes] = await Promise.all([
    db().from("businesses").select("id, name, status, mode, monthly_fee, trial_ends_at, manager_name, manager_phone, billing_name, billing_phone, cancel_requested_at, cancel_reason, created_at, grace_until, plan_key, google_place_id"),
    db().from("payments").select("business_id, kind, method, paid_at, amount").order("paid_at"),
    db().from("contracts").select("venue_name, start_date"),
    db().from("feedback").select("id", { count: "exact", head: true }).is("read_at", null),
    db().from("signups").select("id, venue_name, owner_name, phone, plan, paypal_subscription_id").is("business_id", null).order("created_at"),
    db().from("web_payments").select("id, paypal_order_id, item, amount, venue_name, payer_name").eq("handled", false).order("created_at"),
    db().from("tags").select("business_id").eq("active", true),
    db().from("agreements").select("id, business_id, venue_name, end_date").gte("end_date", addDays(from, -1)),
  ]);
  for (const r of [bizRes, payRes, conRes]) if (r.error) throw new Error(r.error.message);
  const businesses = (bizRes.data ?? []) as BizRow[];
  const payments = (payRes.data ?? []) as PayRow[];
  const contracts = (conRes.data ?? []) as { venue_name: string; start_date: string }[];
  const plaqueCount = new Map<string, number>();
  for (const t of (tagRes.data ?? []) as { business_id: string }[]) plaqueCount.set(t.business_id, (plaqueCount.get(t.business_id) ?? 0) + 1);
  const tasks: Task[] = [];
  const inRange = (d: string) => d >= from && d <= to;
  const payLink = (name: string) => `${SITE_URL}/pagar?n=${encodeURIComponent(name)}`;

  for (const b of businesses) {
    if (b.status === "canceled" || b.status === "paused") continue;
    const pays = payments.filter((p) => p.business_id === b.id);
    const fee = Number(b.monthly_fee);
    const to = payer(b);
    const hi = `Hola${first(to.name)}`;

    const charge = nextCharge(b, pays);
    // Asked to cancel from their app: no more reminders, just the follow-up until marked canceled.
    if (b.cancel_requested_at) {
      tasks.push({
        id: `cancel-${b.id}`,
        kind: "cancelacion",
        date: from,
        title: `${b.name} pidió cancelar`,
        detail: `${b.cancel_reason ? `Motivo: ${b.cancel_reason}. ` : ""}${charge ? `Servicio activo hasta el ${human(charge.due)}; ese día retira las placas` : "Coordina el retiro de las placas"} y márcalo como Cancelado en Editar datos.`,
        businessId: b.id,
        whatsapp: wa(to.phone, `${hi}, te escribe FiveTap. Recibimos tu solicitud de cancelación. ¿Me cuentas un poco más? Si hay algo que podamos mejorar, con gusto lo hacemos. 🙏`),
      });
      continue;
    }
    // FiveTap Test (7 days): remind on the last day, and once it ends, offer a plan.
    if (b.status === "trial" && b.trial_ends_at && fee <= 0) {
      const last = localDate(b.trial_ends_at);
      const empezar = `/empezar?n=${encodeURIComponent(b.name)}`;
      if (inRange(last)) {
        tasks.push({
          id: `test-last-${b.id}-${last}`,
          kind: "prueba",
          date: last,
          title: `Hoy es el último día de la prueba de ${b.name}`,
          detail: "Mañana se pausa sola. Revisa con el dueño sus resultados y ayúdale a elegir su plan.",
          businessId: b.id,
          whatsapp: wa(to.phone, `${hi}, te escribe FiveTap. Hoy es el último día de tu FiveTap Test. ¿Revisamos tus resultados y eliges el plan que más te conviene? Los $${TEST_OFFER.price} del Test se descuentan de tu primer mes. ${SITE_URL}${empezar}`),
          push: { title: `Hoy termina tu prueba · ${b.name}`, body: "Mira cuántos clientes fueron a dejarte reseña y elige tu plan para seguir mañana sin pausa.", url: empezar },
        });
      }
      const endsOn = addDays(last, 1);
      if (from >= endsOn && from <= addDays(endsOn, 13)) {
        tasks.push({
          id: `test-ended-${b.id}-${last}`,
          kind: "prueba",
          date: from,
          title: `Terminó la prueba de ${b.name}: ofrécele un plan`,
          detail: `Sus placas están pausadas desde el ${human(endsOn)}. Cuando elija su plan, cámbialo en Editar datos y registra su primer pago con el Test descontado ($${TEST_OFFER.price} menos).`,
          businessId: b.id,
          whatsapp: wa(to.phone, `${hi}, te escribe FiveTap. Tu FiveTap Test terminó. Elige tu plan y tus placas vuelven a funcionar el mismo día; los $${TEST_OFFER.price} del Test se descuentan de tu primer mes: ${SITE_URL}${empezar}`),
          push: from === endsOn ? { title: `Tu prueba terminó · ${b.name}`, body: "Tus placas están en pausa. Elige tu plan y vuelven a funcionar el mismo día.", url: empezar } : undefined,
        });
      }
      continue;
    }
    if (!charge) continue; // One-time pieces: nothing recurring.
    const { due, amount, label, auto } = charge;
    if (charge.kind === "annual") {
      const notice = addDays(due, -30);
      if (inRange(notice)) {
        tasks.push({
          id: `renov-${b.id}-${due}`,
          kind: "renovacion",
          date: notice,
          title: `Faltan 30 días para la renovación anual de ${b.name}`,
          detail: `Renueva el ${human(due)} por ${money(amount)}. Hoy es el último día de aviso de no renovación.`,
          businessId: b.id,
          whatsapp: wa(to.phone, `${hi}, te escribe FiveTap. Tu plan anual se renueva el ${human(due)} con tu mismo precio congelado de ${money(amount)}. ¡Gracias por seguir creciendo con nosotros! 🙌`),
          due,
          push: { title: "Tu plan anual se renueva en 30 días", body: `El ${human(due)}, con tu mismo precio de ${money(amount)}. ¡Gracias por crecer con FiveTap! 🙌`, url: `/pagar?n=${encodeURIComponent(b.name)}` },
        });
      }
    } else if (charge.kind === "trial") {
      // Last day of the trial: review results together.
      const review = addDays(due, -1);
      if (inRange(review)) {
        tasks.push({
          id: `prueba-${b.id}`,
          kind: "prueba",
          date: review,
          title: `Termina la prueba de ${b.name}`,
          detail: "Revisa con el dueño los toques, las reseñas y los mensajes de la semana. Mañana empieza el plan.",
          businessId: b.id,
          whatsapp: wa(to.phone, `${hi}, hoy termina tu semana de prueba de FiveTap. ¿Te parece si revisamos juntos cuántos clientes fueron a dejarte su reseña? 📊`),
          push: { title: "Hoy termina tu semana de prueba", body: "Mira cuántos clientes fueron a dejarte su reseña gracias a FiveTap. 📊", url: "" },
        });
      }
    }
    const pay = `/pagar?n=${encodeURIComponent(b.name)}`;
    const billing = billingState(b, pays, from);
    const plaques = plaqueCount.get(b.id) ?? 0;
    const plan = planLabel(b, charge, plaques, plans);
    const placas = plaques === 1 ? "tu placa" : plaques ? `tus ${plaques} placas` : "tus placas";
    const lastDay = billing.suspendsOn ? addDays(billing.suspendsOn, -1) : due;

    const overdue = due < from;
    if (inRange(due) || overdue) {
      const late = billing.daysLate;
      const suspended = billing.kind === "suspended";
      const sinceSuspended = suspended && billing.suspendsOn ? Math.round((Date.parse(`${from}T12:00:00Z`) - Date.parse(`${billing.suspendsOn}T12:00:00Z`)) / DAY) : -1;
      // Owner notifications: due day, a final notice on day 3, the day it pauses and then once a week.
      const ownerPush = !overdue
        ? auto
          ? { title: `Hoy se renueva tu plan · ${b.name}`, body: `${plan}: ${money(amount)} por PayPal, automáticamente. ¡Gracias por seguir con nosotros!`, url: "" }
          : { title: `Hoy vence tu pago · ${b.name}`, body: `${plan}: ${money(amount)}. Fecha límite: ${human(due)}. Toca para pagar por Yappy o transferencia. ¡Gracias! 🙏`, url: pay }
        : suspended
          ? sinceSuspended % 7 === 0
            ? { title: `Tus placas están pausadas · ${b.name}`, body: `Tienes un pago pendiente de ${money(amount)} (${plan}). Paga y se reactivan el mismo día. Tus datos están seguros.`, url: pay }
            : undefined
          : late === 3
            ? { title: `Pago vencido · ${b.name}`, body: `Tu ${label} de ${money(amount)} (${plan}) venció el ${human(due)}. Si no se registra hasta el ${human(lastDay)}, ${placas} se pausarán. Tus datos están seguros.`, url: pay }
            : undefined;
      tasks.push({
        id: `cobro-${b.id}-${due}`,
        kind: "cobro",
        date: overdue ? from : due,
        title: suspended
          ? `Suspendido: ${b.name} · ${money(amount)}`
          : overdue
            ? `${from === lastDay ? "Mañana se pausa" : `Pago atrasado (${late} ${late === 1 ? "día" : "días"})`}: ${b.name} · ${money(amount)}`
            : `Cobrar: ${b.name} · ${money(amount)}`,
        detail: suspended
          ? `${plan}. Sus placas y su app están pausadas desde el ${human(billing.suspendsOn!)}. Al registrar el pago se reactivan solas.`
          : overdue
            ? `${plan}. ${auto ? "Debía cobrarse por PayPal: revisa si entró y regístralo." : `${label[0]!.toUpperCase() + label.slice(1)} del ${human(due)}.`} Si no registras el pago, se pausa el ${human(billing.suspendsOn!)}.`
            : auto
              ? `${plan}. Cobro automático por PayPal (${label}) del ${human(due)}. Revisa que haya entrado y regístralo.`
              : `${plan}. ${label[0]!.toUpperCase() + label.slice(1)} del ${human(due)}. Cuando pague, regístralo en el negocio.`,
        businessId: b.id,
        whatsapp: auto && !overdue
          ? undefined
          : wa(to.phone, suspended
              ? `${hi}, te escribe FiveTap. Las placas de ${b.name} están pausadas porque tenemos pendiente tu ${label} de ${money(amount)}. Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)} y se reactivan el mismo día. Tus datos están seguros. 🙏`
              : overdue
                ? `${hi}, te escribe FiveTap. Tu ${label} de ${money(amount)} (${plan}) venció el ${human(due)}. Para que tus placas sigan funcionando, puedes pagar hasta el ${human(lastDay)} por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Gracias! 🙏`
                : `${hi}, te escribe FiveTap. Hoy toca tu ${label} de ${money(amount)} (${plan}). Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Gracias! 🙏`),
        due,
        push: ownerPush,
      });
    }
    // Friendly reminder three days before (the contract promises it for manual payments).
    const remind = addDays(due, -3);
    if (!auto && !overdue && inRange(remind)) {
      tasks.push({
        id: `record-${b.id}-${due}`,
        kind: "recordatorio",
        date: remind,
        title: `Recordar pago a ${b.name}`,
        detail: `${plan}. Su ${label} de ${money(amount)} vence el ${human(due)}.`,
        businessId: b.id,
        whatsapp: wa(to.phone, `${hi}, te escribe FiveTap 😊 Te recuerdo que el ${human(due)} toca tu ${label} de ${money(amount)} (${plan}). Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Que tengas un excelente día!`),
        due,
        push: { title: `Recordatorio de pago · ${b.name}`, body: `Tu ${plan} de ${money(amount)} vence el ${human(due)}. Toca para pagar por Yappy o transferencia.`, url: pay },
      });
    }
  }

  // 3-month contracts: two weeks before the end, review results and agree the renewal.
  for (const a of (agrRes.data ?? []) as { id: string; business_id: string | null; venue_name: string; end_date: string }[]) {
    const notice = addDays(a.end_date, -14);
    if (inRange(notice)) {
      tasks.push({
        id: `contrato-fin-${a.id}`,
        kind: "contrato",
        date: notice,
        title: `El contrato de 3 meses de ${a.venue_name} termina el ${human(a.end_date)}`,
        detail: "Revisa con el dueño sus resultados y acuerden si renuevan por 3 meses, 12 meses u otro período.",
        businessId: a.business_id ?? undefined,
      });
    }
  }

  // Installations booked by contract.
  for (const c of contracts) {
    if (inRange(c.start_date)) {
      tasks.push({ id: `inst-${c.venue_name}-${c.start_date}`, kind: "instalacion", date: c.start_date, title: `Instalación en ${c.venue_name}`, detail: "Lleva las placas y las tarjetas de meseros." });
    }
  }

  // Monthly report on day 1, for every client on a plan.
  const onPlan = businesses.filter((b) => b.mode === "full" && Number(b.monthly_fee) > 0 && b.status !== "canceled");
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (d.endsWith("-01") && onPlan.length) {
      tasks.push({ id: `reporte-${d}`, kind: "reporte", date: d, title: `Enviar el reporte del mes a ${onPlan.length} cliente${onPlan.length === 1 ? "" : "s"}`, detail: "En cada negocio: Reporte mensual → Mes pasado → Copiar reporte → WhatsApp." });
      // Without Google's count (no Place ID or no API key), the month's count is typed by hand.
      const manual = onPlan.filter((x) => !(x.google_place_id && process.env.GOOGLE_PLACES_API_KEY));
      if (manual.length) {
        tasks.push({ id: `conteo-${d}`, kind: "reporte", date: d, title: `Anotar las reseñas de Google de ${manual.length} cliente${manual.length === 1 ? "" : "s"}`, detail: `${manual.slice(0, 4).map((x) => x.name).join(", ")}${manual.length > 4 ? "…" : ""}: en cada negocio, Reseñas en Google → Agregar conteo. El dueño ve el antes → hoy en su app.` });
      }
    }
    // Monday: a short "have a great week" to every owner (buttons in the Agenda page).
    const withPhone = onPlan.filter((x) => payer(x).phone).length;
    if (withPhone && new Date(`${d}T12:00:00Z`).getUTCDay() === 1) {
      tasks.push({ id: `animo-${d}`, kind: "animo", date: d, title: `Mensaje de buena semana a ${withPhone} cliente${withPhone === 1 ? "" : "s"}`, detail: "Opcional: un saludo corto mantiene la relación cercana. Los botones están en la Agenda." });
    }
  }

  // Venues that signed up by themselves on /empezar and still have no business here.
  for (const r of (signupRes.data ?? []) as { id: string; venue_name: string; owner_name: string; phone: string; plan: string; paypal_subscription_id: string | null }[]) {
    const chosen = plans.find((p) => p.key === r.plan) ?? plans[0]!;
    tasks.push({
      id: `signup-${r.id}`,
      kind: "registro",
      date: from,
      title: `Nuevo registro: ${r.venue_name}`,
      detail: `${r.owner_name} · +${r.phone}. ${chosen.name} · ${money(chosen.monthly)} al mes. ${r.paypal_subscription_id ? "Se suscribió por PayPal: registra el primer pago al crear el negocio." : "Todavía sin pagar."} Crea el negocio y coordina la instalación.`,
      whatsapp: wa(r.phone, `Hola ${r.owner_name.split(" ")[0]} 👋 Te escribe FiveTap. Recibimos tu registro de ${r.venue_name}. ¿Qué día y a qué hora te queda bien para instalar tus placas y FiveTap Business?`),
      link: { href: `/admin/new?signup=${r.id}`, label: "Crear negocio" },
    });
  }

  // One-time payments made online from /pagar, until marked as registered.
  for (const w of (webRes.data ?? []) as { id: string; paypal_order_id: string; item: string; amount: number; venue_name: string; payer_name: string | null }[]) {
    tasks.push({
      id: `web-${w.id}`,
      kind: "pagoweb",
      date: from,
      title: `Pago en línea: ${money(Number(w.amount))} · ${w.venue_name}`,
      detail: `${w.item}${w.payer_name ? ` · pagó ${w.payer_name}` : ""} · pedido PayPal ${w.paypal_order_id}. Verifícalo en PayPal y regístralo en el negocio.`,
      webPaymentId: w.id,
    });
  }

  const unread = unreadRes.count ?? 0;
  if (unread > 0) {
    tasks.push({ id: "mensajes", kind: "mensajes", date: from, title: `${unread} queja${unread === 1 ? "" : "s"} privada${unread === 1 ? "" : "s"} sin leer`, detail: "Revísalas y avísale al gerente si hace falta." });
  }

  const order: Record<TaskKind, number> = { pagoweb: 0, registro: 0, cancelacion: 0, cobro: 0, mensajes: 1, recordatorio: 2, prueba: 3, instalacion: 4, renovacion: 5, contrato: 6, reporte: 7, animo: 8 };
  return tasks.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]);
}

/** iCalendar feed of the tasks, so they ring on the founder's phone calendar. */
export function toIcs(tasks: Task[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FiveTap//Agenda//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:FiveTap", "X-WR-TIMEZONE:America/Panama", "REFRESH-INTERVAL;VALUE=DURATION:PT6H"];
  for (const t of tasks) {
    const d = t.date.replace(/-/g, "");
    const next = addDays(t.date, 1).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@fivetap`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(t.title)}`,
      `DESCRIPTION:${esc(`${t.detail}\n${SITE_URL}/admin/agenda`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(t.title)}`,
      "TRIGGER:PT8H", // 8:00 a.m. that day
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
