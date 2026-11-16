import type { Metadata } from "next";
import { accessOf } from "@/lib/entitlements";
import { Upsell } from "@/components/Upsell";
import Link from "next/link";
import { AccessGate } from "@/components/AccessGate";
import { Chart, Chat, Gear, Home, Lock, Users } from "@/components/Icons";
import { accessRole } from "@/lib/access";
import { notFound } from "next/navigation";
import { AppSetup } from "@/components/AppSetup";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ClubPanel } from "@/components/ClubPanel";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { MessageActions } from "@/components/MessageActions";
import { PausedScreen } from "@/components/PausedScreen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { addDays, billingState, human, nextCharge, planLabel, renewalWhat, todayPanama } from "@/lib/agenda";
import { after } from "next/server";
import { businessByOwnerToken, businessDetail, contactsFor, markRead, reportData, reviewSnapshots } from "@/lib/data";
import { setMessageResolved, setStaffName } from "./actions";
import { moduleOn, newOrdersCount } from "@/lib/orders";
import { reservationGlance } from "@/lib/reservations";
import { presetFor } from "@/lib/presets";
import { TeamRanking } from "@/components/TeamRanking";
import { teamPeriod, teamRanking } from "@/lib/team";
import { getPlans } from "@/lib/plans";
import { answeredTicketsCount } from "@/lib/support";
import { claimsFor } from "@/lib/claims";
import { salesWhatsAppUrl } from "@/lib/site";
import type { Tag } from "@/lib/types";
import { dateTime } from "../../admin/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ rol?: string; instalar?: string; app?: string; acceso?: string; equipo?: string }> };

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
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} error={sp.acceso} install={sp.instalar === "1"} />;
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
  // Waiters ranked by guests sent to Google; table plaques by taps.
  // Only pieces in use: deactivated ones stay in the founder's panel, not in the owner's app.
  const waiters = tags.filter((t) => t.active && isWaiter(t)).map(row).sort(byReviews);
  const ordersOn = moduleOn(b, "orders");
  const newOrders = ordersOn ? await newOrdersCount(b.id) : 0;
  const resvOn = moduleOn(b, "reservations");
  const resv = resvOn ? await reservationGlance(b.id) : { today: 0, pending: 0 };
  const answered = await answeredTicketsCount(b.id);
  const acc = await accessOf(b);
  const claimPending = role === "owner" ? (await claimsFor(b.id, 1))[0]?.status === "pending" : false;
  // Tools that suit this kind of business and it does not have yet (only for venues with the app).
  const rec = b.mode === "google" ? null : presetFor(b.kind).modules.reservations && !resvOn ? "reservas" : presetFor(b.kind).modules.orders && !ordersOn ? "pedidos" : null;
  const period = teamPeriod(sp.equipo);
  const team = await teamRanking(tags, period);
  const tables = tags.filter((t) => t.active && !isWaiter(t)).map(row).sort(byScans);
  const best = Math.max(0, ...tags.map((t) => tagStats.get(t.id)?.scans_30d ?? 0));

  const charge = nextCharge(b, payments);
  const planName = planLabel(b, charge, 0, await getPlans());
  const today = todayPanama();
  const payHref = `/mi/${token}/renovar`;
  const pieces = tags.filter((t) => t.active).length;

  return (
    <div className="admin">
      <LiveRefresh />
      <header className="admin-top">
        <div className="container">
          <Logo size={20} />
          <div className="owner-actions">
            <Link className="btn btn-sm owner-help" href={`/mi/${token}/ayuda`}>
              Ayuda
            </Link>
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
      <main className="container admin-main owner-main" id="inicio">
        <div className="biz">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <div>
            <h1 className="owner-title">{b.name}</h1>
            <p className="muted"><span className="live-dot" aria-hidden /> En tiempo real · {role === "owner" ? "Dueño/a" : "Gerente"}</p>
          </div>
        </div>

        {/* 1. Only what needs you now. */}
        {answered > 0 && (
          <Link className="alert alert-warn glance-alert" href={`/mi/${token}/soporte`}>
            FiveTap respondió {answered === 1 ? "tu solicitud" : `${answered} solicitudes`} de soporte. Ver respuesta →
          </Link>
        )}
        {ordersOn && (
          <Link className={`alert ${newOrders ? "alert-warn" : "alert-ok"} glance-alert`} href={`/mi/${token}/pedidos`}>
            <b>{newOrders ? (newOrders === 1 ? "1 pedido nuevo" : `${newOrders} pedidos nuevos`) : "Pedidos desde la placa"}</b> · {newOrders ? "Atender →" : "Ver pedidos →"}
          </Link>
        )}
        {resvOn && (
          <Link className={`alert ${resv.pending ? "alert-warn" : "alert-ok"} glance-alert`} href={`/mi/${token}/reservas`}>
            <b>{resv.today === 1 ? "1 reserva hoy" : `${resv.today} reservas hoy`}{resv.pending ? ` · ${resv.pending} por confirmar` : ""}</b> · Ver reservas →
          </Link>
        )}
        {rec && (
          <a className="rec-card" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Quiero activar ${rec === "reservas" ? "las reservas" : "los pedidos"} desde la placa.`)}>
            <span className="eyebrow-caps">Recomendado para tu negocio</span>
            <b>{rec === "reservas" ? "Activa las reservas desde la placa" : "Activa los pedidos desde la placa"}</b>
            <span className="muted">{rec === "reservas" ? "Tus clientes reservan tocando la placa y tú las confirmas por WhatsApp desde aquí." : "Tus clientes piden desde la mesa con tu menú y el pedido te llega aquí al instante."} Escríbenos para activarlo →</span>
          </a>
        )}
        {pending.length > 0 && (
          <a className="alert alert-warn glance-alert" href="#mensajes">
            <b>{pending.length === 1 ? "1 mensaje de un cliente por resolver" : `${pending.length} mensajes de clientes por resolver`}</b> · Ver →
          </a>
        )}
        {billing.kind === "trial" && billing.suspendsOn && (
          <a className="alert alert-ok glance-alert" href={`/empezar?n=${encodeURIComponent(b.name)}`}>
            <b>Estás en FiveTap Test</b> · Termina el {shortDate(addDays(billing.suspendsOn, -1))}. Elige tu plan para seguir sin pausa →
          </a>
        )}
        {role === "owner" && charge && !charge.auto && b.status === "active" && charge.due <= addDays(today, 3) && (
          <Link className="alert alert-warn glance-alert rn-alert" href={`/mi/${token}/renovar`}>
            <span><b>{charge.due < today ? `Venció ${renewalWhat(pieces, false)}` : charge.due === today ? `Hoy vence ${renewalWhat(pieces, false)}` : charge.due === addDays(today, 1) ? `Mañana vence ${renewalWhat(pieces, false)}` : `${renewalWhat(pieces, false).replace(/^t/, "T")} vence el ${shortDate(charge.due)}`}</b> · {money(charge.amount)}</span>
            <span className="rn-cta">{claimPending ? "En verificación" : "Renovar"}</span>
          </Link>
        )}

        <AppSetup
          endpoint={`/mi/${token}/push`}
          benefits={[
            "Te avisamos al instante cuando un cliente deja un mensaje privado.",
            "Cada mañana, tu resumen del día anterior.",
            "Tu reporte a fin de mes.",
          ]}
          guided={sp.instalar === "1"}
          compactWhenOn
          initialRole={role}
          roles={[
            role === "owner"
              ? { value: "owner", label: "Dueño/a", hint: "Recibes todo, incluidos los recordatorios de pago." }
              : { value: "manager", label: "Gerente", hint: "Recibes los mensajes de clientes y el resumen diario. Sin recordatorios de pago." },
          ]}
        />

        {/* 2. The result, in one look. */}
        <section className="owner-hero glance">
          <span>Este mes, clientes que fueron a dejarte reseña</span>
          <b className="num">{now!.reviews}</b>
          <p>Mes pasado: {prev!.reviews}{sentSince > now!.reviews ? ` · ${sentSince} desde que tienes FiveTap` : ""}</p>
          {before && (
            <div className="glance-rep" aria-label="Tus reseñas en Google">
              <span>Tus reseñas en Google</span>
              <b className="num">{before.reviews} <i>→</i> {(latest ?? before).reviews}</b>
              {gained !== null && gained > 0 ? <em className="num">+{gained} desde FiveTap</em> : <small>Punto de partida · {shortDate(before.taken_on)}</small>}
              {(latest ?? before).rating ? <small>★ {(latest ?? before).rating!.toFixed(1)}</small> : null}
            </div>
          )}
          <div className="glance-row">
            <a href="#placas"><b className="num">{now!.scans}</b><span>Toques</span></a>
            <a href="#mensajes"><b className="num">{now!.feedback}</b><span>Mensajes</span></a>
            <a href="#club"><b className="num">{now!.club}</b><span>Nuevos en el club</span></a>
          </div>
        </section>

        {/* Everything the business uses, one tap away; tools not contracted show a lock and lead to the upgrade. */}
        <nav className="qa-grid" aria-label="Accesos rápidos">
          {[
            { href: "#mensajes", label: "Mensajes", icon: <Chat />, badge: pending.length || null, on: true },
            { href: `/mi/${token}/clientes`, label: "Mis clientes", icon: <Users />, on: acc.has.clients },
            { href: `/mi/${token}/pagina`, label: "Mi página", icon: <Home />, on: acc.has.promos || acc.has.catalog },
            ...(ordersOn ? [{ href: `/mi/${token}/pedidos`, label: "Pedidos", icon: <Chart />, badge: newOrders || null, on: true }] : []),
            ...(resvOn ? [{ href: `/mi/${token}/reservas`, label: "Reservas", icon: <Chart />, badge: resv.pending || null, on: true }] : []),
            { href: `/mi/${token}/reporte`, label: "Reporte", icon: <Chart />, on: true },
            { href: `/mi/${token}/ayuda`, label: "Ayuda", icon: <Gear />, on: true },
            { href: `/mi/${token}/soporte`, label: "Soporte", icon: <Chat />, badge: answered || null, on: true },
            ...(role === "owner" && charge && !charge.auto ? [{ href: `/mi/${token}/renovar`, label: "Renovar", icon: <Gear />, on: true }] : []),
          ].map((q) => (
            <Link key={q.label} href={q.href} className={`qa-card${q.on ? "" : " locked"}`}>
              <span className="qa-ic">{q.icon}</span>
              <span>{q.label}</span>
              {q.on ? (q.badge ? <i className="num">{q.badge}</i> : null) : <em aria-label="No incluido"><Lock /></em>}
            </Link>
          ))}
        </nav>

        {/* 3. Messages from guests: open ones first. */}
        <section className="panel" id="mensajes">
          <div className="panel-head">
            <h2>Mensajes de clientes</h2>
            {feedback.length > 0 && <span className="muted">{pending.length ? `${pending.length} por resolver` : "Todo resuelto ✓"}</span>}
          </div>
          {feedback.length === 0 ? (
            <div className="empty"><p>Sin mensajes por ahora. Aquí te llega lo que un cliente quiera decirte en privado.</p></div>
          ) : (
            [...pending, ...feedback.filter((f) => f.resolved_at)].slice(0, 12).map((f) => (
              <div key={f.id} className={`msg${f.resolved_at ? " msg-done" : ""}`}>
                <div className="msg-meta">
                  <b style={{ color: "var(--ink)" }}>{f.name || "Sin nombre"}</b>
                  {f.rating ? <span className="msg-stars" aria-label={`${f.rating} de 5 estrellas`}>{"★".repeat(f.rating)}<i>{"★".repeat(5 - f.rating)}</i></span> : null}
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

        {/* 4. The team: who brings more guests to Google, live. */}
        {acc.has.team && team.length > 0 && <TeamRanking rows={team} period={period} base={`/mi/${token}`} edit={{ action: setStaffName, hidden: { token } }} />}

        {/* 5. The club, with the promotion sender. */}
        {acc.has.club ? <ClubPanel contacts={contacts} tags={tags} csvHref={`/mi/${token}/clientes.csv`} business={b.name} /> : <Upsell feature="club" token={token} compact />}

        {/* 6. Plaques: only when the owner wants the detail. */}
        {tables.length > 0 && (
          <details className="panel more" id="placas">
            <summary>Tus placas de mesa · {tables.length} · {tables.reduce((n, t) => n + t.scans, 0)} toques en 30 días</summary>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Placa</th><th className="right">Toques</th><th className="right">A Google</th></tr></thead>
                <tbody>
                  {tables.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.label}</b>{best > 0 && t.scans === best && <span className="msg-state seen" style={{ marginLeft: 8 }}>Más usada</span>}{!t.active && <span className="muted"> · desactivada</span>}</td>
                      <td className="right num">{t.scans}</td>
                      <td className="right num">{t.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* 7. The plan: the owner only. */}
        {role === "owner" && charge && b.status !== "canceled" && (
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
                {!charge.auto && !b.cancel_requested_at && <a className="btn btn-dark btn-sm" href={payHref}>Renovar</a>}
                <Link className="btn btn-ghost btn-sm" href={`/mi/${token}/pagos`}>Facturación y pagos</Link>
                <Link className="btn btn-ghost btn-sm" href={`/mi/${token}/pagina`}>Mi página: promociones y catálogo</Link>
              </div>
            </div>
          </section>
        )}

        <p className="muted owner-note" style={{ textAlign: "center" }}>
          Acceso privado con código. Si alguien deja el local, cambia su código en Configuración.
        </p>
      </main>

      {/* App-style bar: the four places the owner goes, always at hand. */}
      <nav className="owner-tabs" aria-label="Secciones">
        <a href="#inicio"><Home />Inicio</a>
        <a href="#mensajes"><Chat />Mensajes{pending.length > 0 && <i className="num">{pending.length}</i>}</a>
        <a href="#club"><Users />Club</a>
        <Link href={`/mi/${token}/reporte`}><Chart />Reporte</Link>
        <Link href={`/mi/${token}/ajustes`}><Gear />Ajustes</Link>
      </nav>
    </div>
  );
}
