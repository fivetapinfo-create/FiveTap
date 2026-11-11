import { agenda, cheerOfTheWeek, todayPanama } from "@/lib/agenda";
import { sendPushOnce } from "@/lib/push";
import { successLine } from "@/lib/report-copy";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Every morning (~7 a.m. Panamá, Vercel cron): the founder's to-do list, payment
// reminders for owners, and a good-morning summary for every venue. Each message
// is logged, so a repeated run never sends it twice. Also keeps Supabase awake.

const DAY = 86_400_000;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const OVERDUE_NUDGES = [1, 3, 7, 14, 21, 30]; // Days after the due date.

const MORNINGS = [
  "¡Que hoy se llene tu local de buenas mesas! 🍽️",
  "Hoy es un gran día para sumar estrellas. ⭐",
  "Recuerda invitar a tus clientes felices a tocar la placa. 📲",
  "Cada cliente bien atendido vale una reseña de 5 estrellas. 🌟",
  "¡Éxitos hoy a ti y a tu equipo! 💪",
  "Un detalle pequeño hoy es una gran reseña mañana. ✨",
  "¡Vamos por un día lleno de clientes contentos! 😊",
];

const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const startOf = (iso: string) => `${iso}T05:00:00Z`; // Midnight in Panamá (UTC-5).

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 });

  const today = todayPanama();
  const yesterday = shift(today, -1);
  const sent = { founder: 0, payments: 0, mornings: 0, months: 0 };

  const [tasks, bizRes] = await Promise.all([
    agenda(today, today),
    db().from("businesses").select("id, name, status, owner_token").in("status", ["trial", "active"]),
  ]);
  if (bizRes.error) return Response.json({ error: bizRes.error.message }, { status: 500 });
  const businesses = bizRes.data as { id: string; name: string; status: string; owner_token: string }[];
  const tokenOf = new Map(businesses.map((b) => [b.id, b.owner_token]));

  // 1. Founder: today's to-do list.
  if (tasks.length) {
    const list = tasks.slice(0, 3).map((t) => t.title).join(" · ");
    sent.founder += await sendPushOnce(`founder-${today}`, { role: "founder" }, {
      title: `Hoy tienes ${tasks.length} pendiente${tasks.length === 1 ? "" : "s"}`,
      body: tasks.length > 3 ? `${list} y ${tasks.length - 3} más` : list,
      url: "/admin/agenda",
    });
  }

  // 2. Whoever pays: reminders, due day, renewals, end of trial. Overdue only on some days.
  for (const t of tasks) {
    if (!t.push || !t.businessId || !tokenOf.has(t.businessId)) continue;
    let key = t.id;
    if (t.kind === "cobro" && t.due && t.due < today) {
      const late = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${t.due}T12:00:00Z`)) / DAY);
      if (!OVERDUE_NUDGES.includes(late)) continue;
      key = `${t.id}-late${late}`;
    }
    sent.payments += await sendPushOnce(`owner-${key}`, { role: "owner", businessId: t.businessId }, {
      ...t.push,
      url: t.push.url || `/mi/${tokenOf.get(t.businessId)}`,
    });
  }

  // 3. Venues: monthly summary on the 1st, otherwise good morning with yesterday's numbers.
  if (today.endsWith("-01")) {
    const [y, m] = today.split("-").map(Number);
    const prevMonth = new Date(Date.UTC(y!, m! - 2, 1)).toISOString().slice(0, 10);
    const monthName = MONTHS[Number(prevMonth.slice(5, 7)) - 1]!;
    const res = await db().from("events").select("business_id, type").in("type", ["scan", "review_click"]).gte("created_at", startOf(prevMonth)).lt("created_at", startOf(today)).limit(50_000);
    const rows = (res.data ?? []) as { business_id: string; type: string }[];
    const scans = count(rows.filter((r) => r.type === "scan"));
    const reviews = count(rows.filter((r) => r.type === "review_click"));
    for (const b of businesses) {
      const period = { key: "prev", label: monthName, scans: scans.get(b.id) ?? 0, nfc: 0, qr: 0, reviews: reviews.get(b.id) ?? 0, feedback: 0, club: 0, top: null } as const;
      sent.months += await sendPushOnce(`month-${b.id}-${today.slice(0, 7)}`, { role: ["owner", "manager"], businessId: b.id }, {
        title: `📊 Tu reporte de ${monthName} está listo`,
        body: successLine({ ...period }, b.name),
        url: `/mi/${b.owner_token}/reporte`,
      });
    }
  } else {
    const res = await db().from("events").select("business_id, type").in("type", ["scan", "review_click"]).gte("created_at", startOf(yesterday)).lt("created_at", startOf(today)).limit(50_000);
    const rows = (res.data ?? []) as { business_id: string; type: string }[];
    const scans = count(rows.filter((r) => r.type === "scan"));
    const reviews = count(rows.filter((r) => r.type === "review_click"));
    const greeting = new Date(`${today}T12:00:00Z`).getUTCDay() === 1 ? cheerOfTheWeek(today) : MORNINGS[Math.floor(Date.parse(`${today}T12:00:00Z`) / DAY) % MORNINGS.length]!;
    for (const b of businesses) {
      const s = scans.get(b.id) ?? 0;
      const r = reviews.get(b.id) ?? 0;
      sent.mornings += await sendPushOnce(`morning-${b.id}-${today}`, { role: ["owner", "manager"], businessId: b.id }, {
        title: `☀️ Buenos días, ${b.name}`,
        body: s
          ? `Ayer ${s} ${s === 1 ? "cliente tocó" : "clientes tocaron"} tus placas y ${r} ${r === 1 ? "fue" : "fueron"} a dejarte reseña en Google. ¡Éxitos hoy!`
          : greeting,
        url: `/mi/${b.owner_token}`,
      });
    }
  }

  // Old log rows are no longer needed to avoid repeats.
  await db().from("push_log").delete().lt("sent_at", new Date(Date.now() - 120 * DAY).toISOString());
  return Response.json({ ok: true, today, sent });
}

function count(rows: { business_id: string }[] | null) {
  const m = new Map<string, number>();
  for (const r of rows ?? []) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1);
  return m;
}
