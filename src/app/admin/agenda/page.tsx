import Link from "next/link";
import { AppSetup } from "@/components/AppSetup";
import { CopyButton } from "@/components/CopyButton";
import { agenda, calendarToken, cheerList, cheerOfTheWeek, todayPanama } from "@/lib/agenda";
import { SITE_URL } from "@/lib/site";
import { signOut } from "../entrar/actions";
import { TaskRow } from "../TaskRow";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dayLabel = (iso: string, today: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const base = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return iso === tomorrow ? `Mañana · ${base}` : base[0]!.toUpperCase() + base.slice(1);
};

export default async function Agenda() {
  const today = todayPanama();
  const until = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [tasks, owners] = await Promise.all([agenda(today, until), cheerList(today)]);
  const now = tasks.filter((t) => t.date === today);
  const later = tasks.filter((t) => t.date > today);
  const byDay = [...new Set(later.map((t) => t.date))].map((d) => ({ day: d, items: later.filter((t) => t.date === d) }));
  const feed = `${SITE_URL}/api/agenda/${calendarToken()}`;
  const webcal = feed.replace(/^https?:/, "webcal:");

  return (
    <main className="container admin-main" style={{ maxWidth: 820 }}>
      <div className="admin-head">
        <div>
          <h1>Agenda</h1>
          <p>{now.length ? `${now.length} cosa${now.length === 1 ? "" : "s"} para hoy` : "Nada pendiente para hoy 🎉"}</p>
        </div>
      </div>

      <AppSetup
        endpoint="/admin/push"
        benefits={[
          "Cada mañana: tus cobros, instalaciones y pendientes del día.",
          "Al instante: cada mensaje privado que deja un cliente en cualquier local.",
        ]}
      />

      <section className="panel">
        <div className="panel-head"><h2>Hoy</h2></div>
        {now.length ? now.map((t) => <TaskRow key={t.id} t={t} />) : <div className="empty"><p>Todo al día. Aquí aparecen los cobros, renovaciones, registros nuevos y quejas nuevas.</p></div>}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Próximos 7 días</h2></div>
        {byDay.length ? (
          byDay.map(({ day, items }) => (
            <div key={day}>
              <p className="agenda-day">{dayLabel(day, today)}</p>
              {items.map((t) => <TaskRow key={t.id} t={t} />)}
            </div>
          ))
        ) : (
          <div className="empty"><p>Semana tranquila: no hay nada programado.</p></div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Ánimo de la semana</h2>
        </div>
        <div className="msg">
          <p>“{cheerOfTheWeek(today)}”</p>
          {owners.length ? (
            <div className="row msg-actions">
              {owners.map((o) => (
                <a key={o.id} className="btn btn-ghost btn-sm" href={o.whatsapp} target="_blank" rel="noopener noreferrer">
                  Enviar a {o.name}
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">Cuando un negocio tenga el WhatsApp del gerente, aquí aparece su botón. El mensaje cambia cada lunes.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Agenda en tu calendario</h2></div>
        <div className="msg">
          <p>Conecta esta agenda a tu calendario y te sonará a las 8:00 a.m. el día de cada tarea. Se actualiza sola.</p>
          <div className="row msg-actions">
            <a className="btn btn-dark btn-sm" href={webcal}>iPhone: agregar al calendario</a>
            <CopyButton value={feed} label="Copiar enlace (Google Calendar)" />
          </div>
          <p className="muted" style={{ fontSize: 14 }}>
            <b>iPhone:</b> toca el botón negro → Suscribirse. <b>Android / Google Calendar:</b> copia el enlace, entra a calendar.google.com en el navegador → “Otros calendarios” → <b>+</b> → “Desde URL” → pégalo → Agregar.
            Este enlace es privado: no lo compartas.
          </p>
        </div>
      </section>

      <form action={signOut} style={{ textAlign: "center" }}>
        <button className="btn btn-ghost btn-sm" type="submit">Cerrar sesión en este dispositivo</button>
      </form>
    </main>
  );
}
