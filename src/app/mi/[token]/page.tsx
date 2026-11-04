import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSetup } from "@/components/AppSetup";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ClubPanel } from "@/components/ClubPanel";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { MessageActions } from "@/components/MessageActions";
import { human, nextCharge, todayPanama } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail, contactsFor, reportData, reviewSnapshots } from "@/lib/data";
import { salesWhatsAppUrl } from "@/lib/site";
import type { Tag } from "@/lib/types";
import { dateTime, pct } from "../../admin/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ rol?: string; instalar?: string; app?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  return {
    title: "FiveTap",
    robots: { index: false, follow: false },
    manifest: `/mi/${token}/manifest.webmanifest${sp.rol === "gerente" ? "?rol=gerente" : ""}`,
    appleWebApp: { capable: true, title: "FiveTap", statusBarStyle: "black" },
  };
}

const WAITER = /meser|camarer|tarjeta|barra|bartender|staff/i;
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const shortDate = (iso: string) => human(iso.slice(0, 10));

/** The owner's FiveTap: a private link that installs as an app, no account to manage. */
export default async function OwnerPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  // Everything at once: one round trip after finding the venue.
  const [d, contacts, snapshots, report] = await Promise.all([businessDetail(b.id), contactsFor(b.id), reviewSnapshots(b.id), reportData(b.id)]);
  if (!d) notFound();
  const { tags, tagStats, feedback, payments } = d;
  const [prev, now] = report.periods;
  const sentSince = report.sinceReviews;
  const label = new Map(tags.map((t) => [t.id, t.label]));

  const before = snapshots[0];
  const latest = snapshots.length > 1 ? snapshots.at(-1)! : null;
  const gained = before && latest ? latest.reviews - before.reviews : null;

  const kpis = [
    { name: "Toques", now: now!.scans, prev: prev!.scans },
    { name: "Fueron a Google", now: now!.reviews, prev: prev!.reviews },
    { name: "Mensajes privados", now: now!.feedback, prev: prev!.feedback },
    { name: "Nuevos en el club", now: now!.club, prev: prev!.club },
  ];

  const row = (t: Tag) => ({ id: t.id, label: t.label, active: t.active, scans: tagStats.get(t.id)?.scans_30d ?? 0, reviews: tagStats.get(t.id)?.reviews_30d ?? 0 });
  const byScans = (a: { scans: number }, z: { scans: number }) => z.scans - a.scans;
  const groups = [
    { title: "Placas de mesa", items: tags.filter((t) => !WAITER.test(t.label)).map(row).sort(byScans) },
    { title: "Tarjetas de meseros", items: tags.filter((t) => WAITER.test(t.label)).map(row).sort(byScans) },
  ].filter((g) => g.items.length);
  const best = Math.max(0, ...tags.map((t) => tagStats.get(t.id)?.scans_30d ?? 0));

  const charge = nextCharge(b, payments);
  const today = todayPanama();
  const payHref = `/pagar?n=${encodeURIComponent(b.name)}`;

  return (
    <div className="admin">
      <LiveRefresh />
      <header className="admin-top">
        <div className="container">
          <Logo size={20} />
          <div className="owner-actions">
            <a className="btn btn-sm owner-help" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Tengo una consulta sobre FiveTap.`)}>
              Ayuda
            </a>
            <Link className="owner-gear" href={`/mi/${token}/ajustes`} aria-label="Configuración">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="container admin-main">
        <div className="biz">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <div>
            <h1 className="owner-title">{b.name}</h1>
            <p className="muted"><span className="live-dot" aria-hidden /> En tiempo real · {now!.label}</p>
          </div>
        </div>

        <AppSetup
          endpoint={`/mi/${token}/push`}
          benefits={[
            "Te avisamos al instante cuando un cliente deja un mensaje privado.",
            "Cada mañana: cuántos clientes tocaron tus placas ayer y cuántos fueron a Google.",
            "Tu recuento de reseñas a fin de mes.",
          ]}
          guided={sp.instalar === "1"}
          compactWhenOn
          initialRole={sp.rol === "gerente" ? "manager" : sp.rol === "dueno" ? "owner" : undefined}
          roles={[
            { value: "owner", label: "Soy dueño/a", hint: "Recibes todo, incluidos los recordatorios de pago." },
            { value: "manager", label: "Gerente, supervisor/a o encargado/a", hint: "Recibes los mensajes de clientes y el resumen diario. Sin recordatorios de pago." },
          ]}
        />

        <section className="owner-hero">
          <span>Clientes que fueron a dejarte reseña este mes</span>
          <b className="num">{now!.reviews}</b>
          <p>
            {sentSince > now!.reviews ? `${sentSince} en total desde que tienes FiveTap. ` : ""}
            Mes pasado: {prev!.reviews}.
          </p>
          {before && (
            <div className="owner-compare">
              <div>
                <small>Antes de FiveTap · {shortDate(before.taken_on)}</small>
                <b className="num">{before.reviews}</b>
                <small>reseñas{before.rating ? ` · ${before.rating.toFixed(1)} ★` : ""}</small>
              </div>
              <div>
                <small>{latest ? `Último conteo · ${shortDate(latest.taken_on)}` : "Con FiveTap"}</small>
                <b className="num">{latest ? latest.reviews : "…"}</b>
                <small>{latest ? `reseñas${latest.rating ? ` · ${latest.rating.toFixed(1)} ★` : ""}` : "Primer conteo a fin de mes"}</small>
              </div>
              {gained !== null && gained > 0 && <p className="owner-gain">+{gained} reseñas nuevas en Google desde que instalaste FiveTap 🎉</p>}
            </div>
          )}
          <small className="owner-hero-note">Cada fin de mes te enviamos el recuento de las reseñas que conseguiste con FiveTap.</small>
        </section>

        <div className="kpis">
          {kpis.map((k) => (
            <div key={k.name} className="kpi">
              <span>{k.name}</span>
              <b className="num">{k.now}</b>
              <small className="muted">Mes pasado: {k.prev}</small>
            </div>
          ))}
        </div>
        {now!.scans > 0 && (
          <p className="muted owner-note">
            “Fueron a Google” son los clientes que abrieron tu página de reseñas: {pct(now!.reviews, now!.scans)} de los que tocaron este mes.
          </p>
        )}


        <section className="panel">
          <div className="panel-head"><h2>Tus placas y tarjetas · últimos 30 días</h2></div>
          {groups.length === 0 ? (
            <div className="empty"><p>Aquí verás cada placa en cuanto la instalemos.</p></div>
          ) : (
            groups.map((g) => (
              <div key={g.title}>
                <p className="agenda-day">{g.title} · {g.items.length}</p>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Placa</th><th className="right">Toques</th><th className="right">A Google</th></tr></thead>
                    <tbody>
                      {g.items.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <b>{t.label}</b> {best > 0 && t.scans === best && "🏆"}
                            {!t.active && <span className="muted"> · desactivada</span>}
                          </td>
                          <td className="right num">{t.scans}</td>
                          <td className="right num">{t.reviews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel" id="mensajes">
          <div className="panel-head"><h2>Mensajes privados</h2></div>
          {feedback.length === 0 ? (
            <div className="empty"><p>Sin mensajes. Cuando un cliente no queda contento, te escribe aquí en vez de dejar una mala reseña.</p></div>
          ) : (
            feedback.slice(0, 30).map((f) => (
              <div key={f.id} className="msg">
                <div className="msg-meta">
                  <b style={{ color: "var(--ink)" }}>{f.name || "Sin nombre"}</b>
                  <span>{(f.tag_id && label.get(f.tag_id)) || "—"}</span>
                  <span>{dateTime(f.created_at)}</span>
                </div>
                <p>{f.message}</p>
                <MessageActions business={b.name} spot={(f.tag_id && label.get(f.tag_id)) || null} guestName={f.name} guestPhone={f.phone} message={f.message} />
              </div>
            ))
          )}
        </section>

        <ClubPanel contacts={contacts} tags={tags} csvHref={`/mi/${token}/clientes.csv`} />

        {charge && b.status !== "canceled" && (
          <section className="panel" id="plan">
            <div className="panel-head">
              <h2>Tu plan</h2>
              <span className={`pill ${b.status}`}>{b.status === "trial" ? "Prueba gratis" : charge.kind === "annual" ? "Plan anual" : "Plan mensual"}</span>
            </div>
            <div className="msg">
              {b.status === "trial" && charge.kind === "trial" ? (
                <p>Tu semana de prueba termina el <b>{shortDate(charge.due)}</b>. Luego, {money(charge.amount)} al mes.</p>
              ) : (
                <p>
                  {charge.due < today ? "Pago pendiente desde el " : "Próximo pago: "}
                  <b>{shortDate(charge.due)}</b> · {money(charge.amount)}
                  {charge.auto ? " · se cobra solo por PayPal" : ""}
                </p>
              )}
              <div className="row msg-actions">
                {!charge.auto && !b.cancel_requested_at && <a className="btn btn-dark btn-sm" href={payHref}>Ver cómo pagar</a>}
                <Link className="btn btn-ghost btn-sm" href={`/mi/${token}/ajustes#suscripcion`}>Administrar suscripción</Link>
              </div>
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-head"><h2>Cómo funciona</h2></div>
          <ol className="owner-how">
            <li><b>El cliente toca la placa</b> con su celular. No descarga nada.</li>
            <li><b>Si quedó contento</b>, va directo a dejarte su reseña en Google.</li>
            <li><b>Si algo no le gustó</b>, te escribe un mensaje privado que te llega aquí, antes de que se convierta en una mala reseña.</li>
            <li><b>Cada fin de mes</b> te enviamos tu recuento de reseñas. Cualquier duda, toca <b>Ayuda</b>.</li>
          </ol>
        </section>

        <p className="muted owner-note" style={{ textAlign: "center" }}>
          Este enlace es privado. Compártelo solo con quien maneje el local.
        </p>
      </main>
    </div>
  );
}
