import type { Metadata } from "next";
import Link from "next/link";
import { PinGate } from "@/components/PinGate";
import { pinUnlocked } from "@/lib/owner-pin";
import { notFound } from "next/navigation";
import { AppSetup } from "@/components/AppSetup";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ClubPanel } from "@/components/ClubPanel";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { MessageActions } from "@/components/MessageActions";
import { PausedScreen } from "@/components/PausedScreen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { addDays, billingState, human, nextCharge, planLabel, todayPanama } from "@/lib/agenda";
import { after } from "next/server";
import { businessByOwnerToken, businessDetail, contactsFor, markRead, reportData, reviewSnapshots } from "@/lib/data";
import { setMessageResolved } from "./actions";
import { getPlans } from "@/lib/plans";
import { salesWhatsAppUrl } from "@/lib/site";
import type { Tag } from "@/lib/types";
import { dateTime } from "../../admin/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ rol?: string; instalar?: string; app?: string; pin?: string }> };

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
// Plaques say what they are; older ones without a kind are told apart by their name.
const isWaiter = (t: Tag) => t.kind === "waiter" || (!t.kind && WAITER.test(t.label));
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const shortDate = (iso: string) => human(iso.slice(0, 10));

/** The owner's FiveTap: a private link that installs as an app, no account to manage. */
export default async function OwnerPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await pinUnlocked(b))) return <PinGate b={b} token={token} wrong={sp.pin === "mal"} />;
  // Everything at once: one round trip after finding the venue.
  const [d, contacts, snapshots, report] = await Promise.all([businessDetail(b.id), contactsFor(b.id), reviewSnapshots(b.id), reportData(b.id)]);
  if (!d) notFound();
  const { tags, tagStats, feedback, payments } = d;
  const billing = billingState(b, payments);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") {
    return <PausedScreen b={b} billing={billing} token={token} plan={planLabel(b, billing.charge, tags.filter((t) => t.active).length, await getPlans())} />;
  }
  const [prev, now] = report.periods;
  const pending = feedback.filter((f) => !f.resolved_at);
  // Seen once the owner or the manager opens the app: the founder can tell it reached them.
  if (feedback.some((f) => !f.read_at)) after(() => markRead({ businessId: b.id }));
  const sentSince = report.sinceReviews;
  const label = new Map(tags.map((t) => [t.id, t.label]));

  const before = snapshots[0];
  const latest = snapshots.length > 1 ? snapshots.at(-1)! : null;
  const gained = before && latest ? latest.reviews - before.reviews : null;


  const row = (t: Tag) => ({ id: t.id, label: t.label, active: t.active, scans: tagStats.get(t.id)?.scans_30d ?? 0, reviews: tagStats.get(t.id)?.reviews_30d ?? 0 });
  const byScans = (a: { scans: number }, z: { scans: number }) => z.scans - a.scans;
  const byReviews = (a: { reviews: number; scans: number }, z: { reviews: number; scans: number }) => z.reviews - a.reviews || z.scans - a.scans;
  const groups = [
    { title: "Ranking de meseros · quién lleva más clientes a Google", waiters: true, items: tags.filter(isWaiter).map(row).sort(byReviews) },
    { title: "Placas de mesa", waiters: false, items: tags.filter((t) => !isWaiter(t)).map(row).sort(byScans) },
  ].filter((g) => g.items.length);
  const MEDALS = ["🥇", "🥈", "🥉"];
  const best = Math.max(0, ...tags.map((t) => tagStats.get(t.id)?.scans_30d ?? 0));

  const charge = nextCharge(b, payments);
  const planName = planLabel(b, charge, 0, await getPlans());
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
            <ThemeToggle />
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

        {/* At a glance: one number that matters, three that explain it. */}
        <section className="owner-hero glance">
          <span>Este mes, clientes que fueron a dejarte reseña</span>
          <b className="num">{now!.reviews}</b>
          <p>Mes pasado: {prev!.reviews}{sentSince > now!.reviews ? ` · ${sentSince} desde que tienes FiveTap` : ""}</p>
          <div className="glance-row">
            <a href="#placas"><b className="num">{now!.scans}</b><span>Toques</span></a>
            <a href="#mensajes"><b className="num">{now!.feedback}</b><span>Mensajes</span></a>
            <a href="#club"><b className="num">{now!.club}</b><span>Nuevos en el club</span></a>
          </div>
        </section>

        {before && (
          <section className="rep" aria-label="Tu reputación en Google">
            <div className="rep-head">
              <span>Tu reputación en Google</span>
              <small className="muted">{latest ? `Actualizado el ${shortDate(latest.taken_on)}` : `Medido el ${shortDate(before.taken_on)}`}</small>
            </div>
            <div className="rep-nums">
              <div><small>Antes de FiveTap</small><b className="num">{before.reviews}</b>{before.rating ? <em>★ {before.rating.toFixed(1)}</em> : null}</div>
              <span className="rep-arrow" aria-hidden>→</span>
              <div><small>Hoy</small><b className="num">{(latest ?? before).reviews}</b>{(latest ?? before).rating ? <em>★ {(latest ?? before).rating!.toFixed(1)}</em> : null}</div>
              {gained !== null && gained > 0 && <strong className="rep-gain num">+{gained}</strong>}
            </div>
            <p className="muted">
              {gained !== null && gained > 0
                ? `${gained} ${gained === 1 ? "reseña nueva" : "reseñas nuevas"} en Google desde que tienes FiveTap.`
                : "Este es tu punto de partida. Aquí verás cuántas reseñas nuevas sumas cada semana."}
            </p>
          </section>
        )}

        {billing.kind === "trial" && billing.suspendsOn && (
          <a className="alert alert-ok glance-alert" href={`/empezar?n=${encodeURIComponent(b.name)}`}>
            <b>Estás en FiveTap Test</b> · Termina el {shortDate(addDays(billing.suspendsOn, -1))}. Elige tu plan para seguir sin pausa →
          </a>
        )}

        {feedback.some((f) => !f.read_at) && (
          <a className="alert alert-warn glance-alert" href="#mensajes">
            <b>Tienes {feedback.filter((f) => !f.read_at).length} {feedback.filter((f) => !f.read_at).length === 1 ? "mensaje nuevo" : "mensajes nuevos"} de clientes</b> · Ver →
          </a>
        )}

        <nav className="glance-links" aria-label="Secciones">
          <a href="#mensajes">Mensajes</a>
          <a href="#placas">Placas</a>
          <a href="#club">Club</a>
          <Link href={`/mi/${token}/reporte`}>Reporte</Link>
          <Link href={`/mi/${token}/pagos`}>Pagos</Link>
        </nav>

        <AppSetup
          endpoint={`/mi/${token}/push`}
          benefits={[
            "Te avisamos al instante cuando un cliente deja un mensaje privado.",
            "Cada mañana, tu resumen del día anterior.",
            "Tu reporte a fin de mes.",
          ]}
          guided={sp.instalar === "1"}
          compactWhenOn
          initialRole={sp.rol === "gerente" ? "manager" : sp.rol === "dueno" ? "owner" : undefined}
          roles={[
            { value: "owner", label: "Soy dueño/a", hint: "Recibes todo, incluidos los recordatorios de pago." },
            { value: "manager", label: "Gerente, supervisor/a o encargado/a", hint: "Recibes los mensajes de clientes y el resumen diario. Sin recordatorios de pago." },
          ]}
        />

        <section className="panel" id="mensajes">
          <div className="panel-head">
            <h2>Mensajes privados</h2>
            {feedback.length > 0 && <span className="muted">{pending.length ? `${pending.length} por resolver` : "Todo resuelto ✓"}</span>}
          </div>
          {feedback.length === 0 ? (
            <div className="empty"><p>Sin mensajes por ahora. Aquí te llega lo que un cliente quiera decirte en privado.</p></div>
          ) : (
            [...pending, ...feedback.filter((f) => f.resolved_at)].slice(0, 12).map((f) => (
              <div key={f.id} className={`msg${f.resolved_at ? " msg-done" : ""}`}>
                <div className="msg-meta">
                  <b style={{ color: "var(--ink)" }}>{f.name || "Sin nombre"}</b>
                  <span>{(f.tag_id && label.get(f.tag_id)) || "—"}</span>
                  <span>{dateTime(f.created_at)}</span>
                  <span className={`msg-state ${f.resolved_at ? "done" : f.read_at ? "seen" : "new"}`}>{f.resolved_at ? "Resuelto" : f.read_at ? "Visto" : "Nuevo"}</span>
                </div>
                <p>{f.message}</p>
                <div className="row msg-row">
                  {!f.resolved_at && <MessageActions business={b.name} spot={(f.tag_id && label.get(f.tag_id)) || null} guestName={f.name} guestPhone={f.phone} message={f.message} />}
                  <form action={setMessageResolved}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="feedback_id" value={f.id} />
                    <input type="hidden" name="resolved" value={f.resolved_at ? "0" : "1"} />
                    <button className={`btn btn-sm ${f.resolved_at ? "btn-ghost" : "btn-dark"}`} type="submit">{f.resolved_at ? "Reabrir" : "Marcar resuelto ✓"}</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel" id="placas">
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
                            {g.waiters ? <>{t.reviews > 0 && MEDALS.at(g.items.indexOf(t))} <b>{t.label}</b></> : <><b>{t.label}</b> {best > 0 && t.scans === best && "🏆"}</>}
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

        <ClubPanel contacts={contacts} tags={tags} csvHref={`/mi/${token}/clientes.csv`} business={b.name} />

        {charge && b.status !== "canceled" && (
          <section className="panel" id="plan">
            <div className="panel-head">
              <h2>Tu plan</h2>
              <span className={`pill ${b.status}`}>{planName}</span>
            </div>
            <div className="msg">
              {b.status === "trial" && charge.kind === "trial" ? (
                <p>Tu FiveTap Test termina el <b>{shortDate(charge.due)}</b>. Elige tu plan para seguir sin pausa.</p>
              ) : (
                <p>
                  {charge.due < today ? "Pago pendiente desde el " : "Próximo pago: "}
                  <b>{shortDate(charge.due)}</b> · {money(charge.amount)}
                  {charge.auto ? " · se cobra solo por PayPal" : ""}
                </p>
              )}
              <div className="row msg-actions">
                {!charge.auto && !b.cancel_requested_at && <a className="btn btn-dark btn-sm" href={payHref}>Ver cómo pagar</a>}
                <Link className="btn btn-ghost btn-sm" href={`/mi/${token}/pagos`}>Facturación y pagos</Link>
              </div>
            </div>
          </section>
        )}

        <p className="muted owner-note" style={{ textAlign: "center" }}>
          Este enlace es privado. Compártelo solo con quien maneje el local.
        </p>
      </main>
    </div>
  );
}
