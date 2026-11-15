import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { todayPanama } from "@/lib/agenda";
import { businessByOwnerToken } from "@/lib/data";
import { moduleOn } from "@/lib/orders";
import { COUNTRIES, addDaysIso } from "@/lib/reservation-rules";
import { R_STATUS, bookingRules, reservationStats, reservationsBetween, type Reservation } from "@/lib/reservations";
import { salesWhatsAppUrl } from "@/lib/site";
import { addReservationOwner, moveReservation, saveReservationSettingsOwner } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ dia?: string; mes?: string; ok?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Reservas · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WD = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WD_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const clock = (t: string) => { const h = Number(t.slice(0, 2)); return `${h % 12 || 12}:${t.slice(3)} ${h >= 12 ? "p. m." : "a. m."}`; };
const longDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const live = (r: Reservation) => r.status === "pending" || r.status === "confirmed";

/** Reservations: month calendar, the chosen day, the ones waiting for confirmation, stats and settings. */
export default async function ReservationsPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const on = moduleOn(b, "reservations");
  const today = todayPanama();
  const day = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : today;
  const month = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : day.slice(0, 7);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const [monthList, upcoming, stats, rules] = on
    ? await Promise.all([reservationsBetween(b.id, first, last), reservationsBetween(b.id, today, addDaysIso(today, 60)), reservationStats(b.id), bookingRules(b.id)])
    : [[], [], null, null];
  const ofDay = monthList.filter((r) => r.reserved_on === day);
  const dayList = day.slice(0, 7) === month ? ofDay : await (on ? reservationsBetween(b.id, day, day) : Promise.resolve([]));
  const pending = upcoming.filter((r) => r.status === "pending");
  const todayLive = upcoming.filter((r) => r.reserved_on === today && live(r));
  const perDay = new Map<string, { n: number; people: number; pending: number }>();
  for (const r of monthList.filter(live)) {
    const x = perDay.get(r.reserved_on) ?? { n: 0, people: 0, pending: 0 };
    perDay.set(r.reserved_on, { n: x.n + 1, people: x.people + r.party_size, pending: x.pending + (r.status === "pending" ? 1 : 0) });
  }
  const lead = new Date(`${first}T12:00:00Z`).getUTCDay();
  const prevMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
  const nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 7);
  const here = `?dia=${day}&mes=${month}`;
  const maxCountry = Math.max(1, ...(stats?.countries.map(([, n]) => n) ?? [1]));

  const Row = ({ r }: { r: Reservation }) => (
    <li className={`rv-row rv-${r.status}`}>
      <div className="rv-time num">{clock(r.reserved_at)}</div>
      <div className="rv-main">
        <b>{r.customer_name} · {r.party_size} {r.party_size === 1 ? "persona" : "personas"}</b>
        <small className="muted">
          {[r.reserved_on !== day ? longDay(r.reserved_on) : null, r.country, r.phone, r.source === "manual" ? "anotada por el local" : "desde la placa"].filter(Boolean).join(" · ")}
        </small>
        {r.notes && <small className="rv-note">“{r.notes}”</small>}
        {r.status === "canceled" && r.cancel_reason && <small className="muted">Motivo: {r.cancel_reason}</small>}
      </div>
      <span className={`rv-pill rv-pill-${r.status}`}>{R_STATUS[r.status]}</span>
      <div className="rv-actions">
        {r.status === "pending" && (
          <form action={moveReservation}>
            <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={here} />
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="confirmed" /><input type="hidden" name="notify" value="1" />
            <SubmitButton className="btn btn-dark btn-sm" pending="…">{r.phone ? "Confirmar por WhatsApp" : "Confirmar"}</SubmitButton>
          </form>
        )}
        {r.status === "confirmed" && r.reserved_on <= today && (
          <>
            {(["attended", "no_show"] as const).map((to) => (
              <form key={to} action={moveReservation}>
                <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={here} />
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value={to} />
                <SubmitButton className={`btn btn-sm ${to === "attended" ? "btn-dark" : "btn-ghost"}`} pending="…">{to === "attended" ? "Llegó" : "No vino"}</SubmitButton>
              </form>
            ))}
          </>
        )}
        {live(r) && (
          <details className="order-cancel">
            <summary className="btn btn-ghost btn-sm">Cancelar</summary>
            <form action={moveReservation} className="row">
              <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={here} />
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="canceled" /><input type="hidden" name="notify" value="1" />
              <input className="input" name="reason" maxLength={200} placeholder="Motivo (opcional)" />
              <SubmitButton className="btn btn-danger btn-sm" pending="…">{r.phone ? "Cancelar y avisar" : "Cancelar"}</SubmitButton>
            </form>
          </details>
        )}
        {(r.status === "canceled" || r.status === "attended" || r.status === "no_show") && r.reserved_on >= today && (
          <form action={moveReservation}>
            <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={here} />
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value={r.status === "canceled" ? "pending" : "confirmed"} />
            <SubmitButton className="btn btn-ghost btn-sm" pending="…">Deshacer</SubmitButton>
          </form>
        )}
      </div>
    </li>
  );

  return (
    <div className="admin">
      {on && <LiveRefresh seconds={30} />}
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings rv-page">
        <div>
          <h1 className="owner-title">Reservas</h1>
          <p className="muted">Las piden tus clientes desde la placa o las anotas tú. Confirmar abre WhatsApp con el mensaje listo.</p>
        </div>
        {sp.ok === "nueva" && <p className="alert alert-ok" role="status">Reserva anotada y confirmada.</p>}
        {sp.ok === "ajustes" && <p className="alert alert-ok" role="status">Ajustes guardados. La página de reservas ya los usa.</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
        {!on || !stats || !rules ? (
          <div className="panel"><div className="empty">
            <p>Las reservas desde la placa no están activas en tu plan. Tus clientes podrían reservar tocando la placa y tú las verías aquí con su calendario.</p>
            <a className="btn btn-dark" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Quiero activar las reservas desde la placa.`)}>Quiero activarlas</a>
          </div></div>
        ) : (
          <>
            <div className="kpis orders-kpis">
              <div className="kpi"><span>Hoy</span><b className="num">{todayLive.length}</b><small className="muted">{todayLive.reduce((n, r) => n + r.party_size, 0)} personas</small></div>
              <div className={`kpi${pending.length ? " kpi-alert" : ""}`}><span>Por confirmar</span><b className="num">{pending.length}</b></div>
              <div className="kpi"><span>Próximos 30 días</span><b className="num">{stats.upcoming}</b><small className="muted">{stats.upcomingPeople} personas</small></div>
              <div className="kpi"><span>No vinieron (30 días)</span><b className="num">{stats.noShowRate == null ? "—" : `${stats.noShowRate}%`}</b></div>
            </div>

            {pending.length > 0 && (
              <section className="panel">
                <div className="panel-head"><h2>Por confirmar</h2><span className="muted">{pending.length}</span></div>
                <ul className="rv-list">{pending.map((r) => <Row key={r.id} r={r} />)}</ul>
              </section>
            )}

            <section className="panel">
              <div className="panel-head">
                <h2 style={{ textTransform: "capitalize" }}>{MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}</h2>
                <div className="row" style={{ gap: 6 }}>
                  <Link className="btn btn-ghost btn-sm" href={`?mes=${prevMonth}&dia=${prevMonth}-01`} aria-label="Mes anterior">←</Link>
                  <Link className="btn btn-ghost btn-sm" href="?">Hoy</Link>
                  <Link className="btn btn-ghost btn-sm" href={`?mes=${nextMonth}&dia=${nextMonth}-01`} aria-label="Mes siguiente">→</Link>
                </div>
              </div>
              <div className="rv-cal" role="grid">
                {WD.map((w) => <span key={w} className="rv-wd">{w}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: lastDay }, (_, i) => {
                  const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
                  const x = perDay.get(iso);
                  return (
                    <Link key={iso} href={`?mes=${month}&dia=${iso}#dia`} className={`rv-day${iso === day ? " on" : ""}${iso === today ? " today" : ""}${iso < today ? " past" : ""}`} aria-current={iso === day ? "date" : undefined}>
                      <span className="num">{i + 1}</span>
                      {x && <small className="num">{x.n} · {x.people}p{x.pending ? " •" : ""}</small>}
                    </Link>
                  );
                })}
              </div>
              <p className="muted rv-legend">Número de reservas · personas. El punto indica alguna por confirmar.</p>
            </section>

            <section className="panel" id="dia">
              <div className="panel-head"><h2 style={{ textTransform: "capitalize" }}>{day === today ? "Hoy · " : ""}{longDay(day)}</h2><span className="muted">{dayList.filter(live).reduce((n, r) => n + r.party_size, 0)} personas</span></div>
              {dayList.length === 0 ? <div className="empty"><p>No hay reservas este día.</p></div> : <ul className="rv-list">{dayList.map((r) => <Row key={r.id} r={r} />)}</ul>}
            </section>

            <details className="panel more" id="nueva">
              <summary>+ Anotar una reserva (teléfono o en persona)</summary>
              <form action={addReservationOwner} className="form-section">
                <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={here} />
                <div className="grid-2">
                  <label className="field"><span>Nombre</span><input className="input" name="name" required maxLength={80} /></label>
                  <label className="field"><span>WhatsApp (opcional)</span><input className="input" name="phone" type="tel" maxLength={30} placeholder="6000-0000" /></label>
                  <label className="field"><span>Día</span><input className="input" type="date" name="date" required min={today} defaultValue={day >= today ? day : today} /></label>
                  <label className="field"><span>Hora</span><input className="input" type="time" name="time" required step={900} defaultValue="19:00" /></label>
                  <label className="field"><span>Personas</span><input className="input" type="number" name="party" min={1} max={200} defaultValue={2} required /></label>
                  <label className="field"><span>Procedencia</span><select className="select" name="country" defaultValue="Panamá">{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                </div>
                <label className="field"><span>Notas</span><input className="input" name="notes" maxLength={400} /></label>
                <SubmitButton className="btn btn-dark" pending="Guardando…">Anotar reserva confirmada</SubmitButton>
              </form>
            </details>

            <section className="panel">
              <div className="panel-head"><h2>De dónde vienen</h2><span className="muted">Últimos 30 días y próximos 30 · lo que declaran</span></div>
              {stats.countries.length === 0 ? <div className="empty"><p>Aquí verás la procedencia de tus clientes cuando haya reservas.</p></div> : (
                <ul className="rv-bars">
                  {stats.countries.slice(0, 8).map(([c, n]) => (
                    <li key={c}><span>{c}</span><div className="rv-bar"><i style={{ width: `${Math.round((n / maxCountry) * 100)}%` }} /></div><b className="num">{n}</b></li>
                  ))}
                </ul>
              )}
              {stats.weekdays.length > 0 && <p className="muted rv-legend">Días con más reservas: {stats.weekdays.slice(0, 3).map(([d, n]) => `${WD_LONG[Number(d)]} (${n})`).join(", ")}.</p>}
            </section>

            {role === "owner" && (
              <details className="panel more" id="ajustes">
                <summary>Ajustes de reservas</summary>
                <form action={saveReservationSettingsOwner} className="form-section">
                  <input type="hidden" name="token" value={token} />
                  <div className="grid-2">
                    <label className="field"><span>Máximo de personas por reserva</span><input className="input" type="number" name="max_party" min={1} max={200} defaultValue={rules.settings.max_party} /></label>
                    <label className="field"><span>Días de anticipación</span><input className="input" type="number" name="days_ahead" min={1} max={365} defaultValue={rules.settings.days_ahead} /></label>
                    <label className="field"><span>Aviso mínimo (horas)</span><input className="input" type="number" name="min_notice_hours" min={0} max={72} defaultValue={rules.settings.min_notice_hours} /></label>
                  </div>
                  <small className="muted">{rules.hours.length === 7 ? "Los horarios que se ofrecen salen de tu horario de atención." : "Aún no tienes horario cargado: se ofrecen de 8:00 a. m. a 10:00 p. m. Pídele a FiveTap que cargue tu horario."}</small>
                  <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar ajustes</SubmitButton>
                </form>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
