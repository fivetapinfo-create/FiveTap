import "server-only";
import { createHash } from "node:crypto";
import { db } from "./supabase";
import { SITE_URL } from "./site";
import type { Business, Payment } from "./types";

// The founder's to-do list, computed from the data every time: payments to
// collect, trials ending, annual renewals, reports, contracts to prepare and
// unread complaints. Each task can carry a ready-to-send WhatsApp message.

export type TaskKind = "cobro" | "recordatorio" | "prueba" | "renovacion" | "reporte" | "contrato" | "mensajes" | "instalacion" | "animo" | "cancelacion" | "registro";

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
  /** Notification for whoever pays, sent by the daily cron to their FiveTap app. */
  push?: { title: string; body: string; url: string };
};

const DAY = 86_400_000;
const PANAMA_OFFSET = 5 * 3600_000;

export const todayPanama = () => new Date(Date.now() - PANAMA_OFFSET).toISOString().slice(0, 10);

function addDays(iso: string, n: number) {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

function addMonths(iso: string, n: number) {
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

type BizRow = Pick<Business, "id" | "name" | "status" | "mode" | "monthly_fee" | "trial_ends_at" | "manager_name" | "manager_phone" | "billing_name" | "billing_phone" | "cancel_requested_at" | "cancel_reason" | "created_at">;
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

/** Next charge: when the trial ends, then a month or a year after the last payment. */
export function nextCharge(
  b: Pick<Business, "mode" | "monthly_fee" | "trial_ends_at">,
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
  return null;
}

/** Every task from `from` to `to` (inclusive), sorted by date. Overdue charges are pulled to `from`. */
export async function agenda(from: string, to: string): Promise<Task[]> {
  const [bizRes, payRes, conRes, unreadRes, signupRes] = await Promise.all([
    db().from("businesses").select("id, name, status, mode, monthly_fee, trial_ends_at, manager_name, manager_phone, billing_name, billing_phone, cancel_requested_at, cancel_reason, created_at"),
    db().from("payments").select("business_id, kind, method, paid_at, amount").order("paid_at"),
    db().from("contracts").select("venue_name, start_date"),
    db().from("feedback").select("id", { count: "exact", head: true }).is("read_at", null),
    db().from("signups").select("id, venue_name, owner_name, phone, paypal_subscription_id").is("business_id", null).order("created_at"),
  ]);
  for (const r of [bizRes, payRes, conRes]) if (r.error) throw new Error(r.error.message);
  const businesses = (bizRes.data ?? []) as BizRow[];
  const payments = (payRes.data ?? []) as PayRow[];
  const contracts = (conRes.data ?? []) as { venue_name: string; start_date: string }[];
  const contractNames = new Set(contracts.map((c) => c.venue_name.trim().toLowerCase()));
  const tasks: Task[] = [];
  const inRange = (d: string) => d >= from && d <= to;
  const payLink = (name: string) => `${SITE_URL}/pagar?n=${encodeURIComponent(name)}`;

  for (const b of businesses) {
    if (b.status === "canceled" || b.status === "paused") continue;
    const pays = payments.filter((p) => p.business_id === b.id);
    const fee = Number(b.monthly_fee);
    const to = payer(b);
    const hi = `Hola${first(to.name)}`;

    // Contract still to prepare for a client on a plan.
    if (b.mode === "full" && fee > 0 && !contractNames.has(b.name.trim().toLowerCase())) {
      tasks.push({
        id: `contrato-${b.id}`,
        kind: "contrato",
        date: from,
        title: `Hacer el contrato de ${b.name}`,
        detail: "Este cliente tiene plan y todavía no tiene contrato generado.",
        businessId: b.id,
      });
    }

    // 30-day guarantee: on day 30, take today's Google review count to compare with day 1.
    const day30 = addDays(localDate(b.created_at), 30);
    if (b.mode === "full" && fee > 0 && inRange(day30) && !pays.some((p) => p.kind === "annual")) {
      tasks.push({
        id: `garantia-${b.id}`,
        kind: "prueba",
        date: day30,
        title: `Día 30 de garantía: ${b.name}`,
        detail: "Anota hoy sus reseñas de Google en la ficha (Reseñas en Google · antes y después) y compáralas con las del día de la instalación.",
        businessId: b.id,
      });
    }

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

    const overdue = due < from;
    if (inRange(due) || overdue) {
      tasks.push({
        id: `cobro-${b.id}-${due}`,
        kind: "cobro",
        date: overdue ? from : due,
        title: `${overdue ? "Pago atrasado" : "Cobrar"}: ${b.name} · ${money(amount)}`,
        detail: auto
          ? `Cobro automático por PayPal (${label}) del ${human(due)}. Revisa que haya entrado y regístralo.`
          : `${label[0]!.toUpperCase() + label.slice(1)} del ${human(due)}. Cuando pague, regístralo en el negocio.`,
        businessId: b.id,
        whatsapp: auto
          ? undefined
          : wa(to.phone, overdue
              ? `${hi}, te escribe FiveTap. Tu ${label} de ${money(amount)} venció el ${human(due)}. Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Gracias! 🙏`
              : `${hi}, te escribe FiveTap. Hoy toca tu ${label} de ${money(amount)}. Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Gracias! 🙏`),
        due,
        push: auto
          ? { title: `Hoy se renueva tu plan FiveTap`, body: `Se cobra ${money(amount)} por PayPal automáticamente. ¡Gracias por seguir con nosotros!`, url: "" }
          : overdue
            ? { title: "Tienes un pago pendiente", body: `Tu ${label} de ${money(amount)} venció el ${human(due)}. Toca para pagar por Yappy o transferencia.`, url: pay }
            : { title: `Hoy toca tu ${label}`, body: `${money(amount)} · Toca para pagar por Yappy o transferencia. ¡Gracias! 🙏`, url: pay },
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
        detail: `Su ${label} de ${money(amount)} vence el ${human(due)}.`,
        businessId: b.id,
        whatsapp: wa(to.phone, `${hi}, te escribe FiveTap 😊 Te recuerdo que el ${human(due)} toca tu ${label} de ${money(amount)}. Puedes pagar por Yappy o transferencia aquí: ${payLink(b.name)}. ¡Que tengas un excelente día!`),
        due,
        push: { title: "Recordatorio de pago", body: `Tu ${label} de ${money(amount)} vence el ${human(due)}. Toca para ver cómo pagar.`, url: pay },
      });
    }
  }

  // Installations booked by contract.
  for (const c of contracts) {
    if (inRange(c.start_date)) {
      tasks.push({ id: `inst-${c.venue_name}-${c.start_date}`, kind: "instalacion", date: c.start_date, title: `Instalación en ${c.venue_name}`, detail: "Lleva las placas, los stickers y el contrato impreso en 2 copias." });
    }
  }

  // Monthly report on day 1, for every client on a plan.
  const onPlan = businesses.filter((b) => b.mode === "full" && Number(b.monthly_fee) > 0 && b.status !== "canceled");
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (d.endsWith("-01") && onPlan.length) {
      tasks.push({ id: `reporte-${d}`, kind: "reporte", date: d, title: `Enviar el reporte del mes a ${onPlan.length} cliente${onPlan.length === 1 ? "" : "s"}`, detail: "En cada negocio: Reporte mensual → Mes pasado → Copiar reporte → WhatsApp." });
    }
    // Monday: a short "have a great week" to every owner (buttons in the Agenda page).
    const withPhone = onPlan.filter((x) => payer(x).phone).length;
    if (withPhone && new Date(`${d}T12:00:00Z`).getUTCDay() === 1) {
      tasks.push({ id: `animo-${d}`, kind: "animo", date: d, title: `Mensaje de buena semana a ${withPhone} cliente${withPhone === 1 ? "" : "s"}`, detail: "Opcional: un saludo corto mantiene la relación cercana. Los botones están en la Agenda." });
    }
  }

  // Venues that signed up by themselves on /empezar and still have no business here.
  for (const r of (signupRes.data ?? []) as { id: string; venue_name: string; owner_name: string; phone: string; paypal_subscription_id: string | null }[]) {
    tasks.push({
      id: `signup-${r.id}`,
      kind: "registro",
      date: from,
      title: `Nuevo registro: ${r.venue_name}`,
      detail: `${r.owner_name} · +${r.phone}. ${r.paypal_subscription_id ? "Se suscribió por PayPal ($129 al mes)." : "Todavía sin pagar."} Crea el negocio y coordina la instalación.`,
      whatsapp: wa(r.phone, `Hola ${r.owner_name.split(" ")[0]} 👋 Te escribe FiveTap. Recibimos tu registro de ${r.venue_name}. ¿Qué día y a qué hora te queda bien para instalar tus placas y FiveTap Business?`),
      link: { href: `/admin/new?signup=${r.id}`, label: "Crear negocio" },
    });
  }

  const unread = unreadRes.count ?? 0;
  if (unread > 0) {
    tasks.push({ id: "mensajes", kind: "mensajes", date: from, title: `${unread} queja${unread === 1 ? "" : "s"} privada${unread === 1 ? "" : "s"} sin leer`, detail: "Revísalas y avísale al gerente si hace falta." });
  }

  const order: Record<TaskKind, number> = { registro: 0, cancelacion: 0, cobro: 0, mensajes: 1, recordatorio: 2, prueba: 3, instalacion: 4, renovacion: 5, contrato: 6, reporte: 7, animo: 8 };
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
