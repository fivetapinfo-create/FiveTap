import Link from "next/link";
import { BusinessLogo } from "@/components/BusinessLogo";
import { FileText, Globe, Layers, Plus, ReceiptIcon, Wallet } from "@/components/Icons";
import { BILLING_LABEL, agenda, billingAll, todayPanama } from "@/lib/agenda";
import { listBusinesses, unreadCount } from "@/lib/data";
import { getPlans, planOf } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/supabase";
import { verticalByKey } from "@/lib/verticals";
import { Flash } from "./Flash";
import { TaskRow } from "./TaskRow";
import { STATUS_LABEL, ago, usd } from "./format";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * The founder's home: what needs doing today, the money, and every venue. Four numbers,
 * today's to-dos with their WhatsApp ready, quick actions, and the list of venues.
 */
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const today = todayPanama();
  const month = today.slice(0, 7);
  const [rows, sp, billing, plans, tagRes, receiptRes, unread, tasks] = await Promise.all([
    listBusinesses(),
    searchParams,
    billingAll(today),
    getPlans(),
    db().from("tags").select("kind, active"),
    db().from("receipts").select("amount").eq("status", "paid").gte("paid_on", `${month}-01`),
    unreadCount(),
    agenda(today, today),
  ]);
  const billOf = new Map(billing.map((r) => [r.business.id, r.billing]));
  const paying = rows.filter((r) => r.business.status === "active");
  const mrr = paying.reduce((n, r) => n + Number(r.business.monthly_fee), 0);
  const collected = ((receiptRes.data ?? []) as { amount: number }[]).reduce((n, r) => n + Number(r.amount), 0);
  const owed = billing.filter((r) => r.billing.kind === "late" || r.billing.kind === "suspended");
  const soon = billing.filter((r) => r.billing.charge && r.billing.daysLate >= -7 && r.billing.daysLate <= 0 && !r.billing.blocked);
  const amount = (list: typeof billing) => list.reduce((n, r) => n + Number(r.billing.charge?.amount ?? 0), 0);
  const onPlan = plans.map((p) => `${p.name.replace(/^FiveTap\s+/, "")} ${paying.filter((r) => planOf(r.business, plans)?.key === p.key).length}`).join(" · ");
  const active = ((tagRes.data ?? []) as { kind: string; active: boolean }[]).filter((t) => t.active);
  const todo = tasks.filter((t) => t.kind !== "mensajes");
  const d = new Date(`${today}T12:00:00Z`);
  const dateLine = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Hoy</h1>
          <p>{dateLine[0]!.toUpperCase() + dateLine.slice(1)} · {todo.length ? `${todo.length} pendiente${todo.length === 1 ? "" : "s"}` : "todo al día 🎉"}</p>
        </div>
        <Link className="btn btn-dark btn-sm" href="/admin/new">+ Nuevo negocio</Link>
      </div>

      <Flash ok={sp.ok} />

      <div className="kpis home-kpis">
        <Link href="/admin/comprobantes" className="kpi"><span>Cobrado este mes</span><b className="num">{usd(collected)}</b><small className="muted">Mensualidades: {usd(mrr)} al mes</small></Link>
        <Link href="/admin/cobros" className={`kpi${owed.length ? " kpi-alert" : ""}`}><span>Por cobrar</span><b className="num">{usd(amount(owed) + amount(soon))}</b><small className="muted">{owed.length} atrasado{owed.length === 1 ? "" : "s"} · {soon.length} vence{soon.length === 1 ? "" : "n"} en 7 días</small></Link>
        <a href="#negocios" className="kpi"><span>Clientes activos</span><b className="num">{paying.length}</b><small className="muted">{onPlan}</small></a>
        <Link href="/admin/mensajes" className={`kpi${unread ? " kpi-alert" : ""}`}><span>Mensajes sin leer</span><b className="num">{unread}</b><small className="muted">de clientes de los locales</small></Link>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Para hoy</h2>
          <Link className="muted" href="/admin/agenda">Ver la semana →</Link>
        </div>
        {todo.length ? (
          todo.slice(0, 6).map((t) => <TaskRow key={t.id} t={t} />)
        ) : (
          <div className="empty"><p>Nada pendiente. Aquí aparecen los cobros, los Tests por terminar, los registros nuevos y lo que toque hacer hoy.</p></div>
        )}
        {todo.length > 6 && <div className="msg"><Link className="btn btn-ghost btn-sm" href="/admin/agenda">Ver los {todo.length - 6} restantes</Link></div>}
      </section>

      <nav className="home-actions" aria-label="Acciones rápidas">
        <Link href="/admin/new"><Plus />Nuevo negocio</Link>
        <Link href="/admin/cobros"><Wallet />Cobros</Link>
        <Link href="/admin/contratos"><FileText />Contratos</Link>
        <Link href="/admin/comprobantes"><ReceiptIcon />Comprobantes</Link>
        <Link href="/admin/planes"><Layers />Planes</Link>
        <a href={SITE_URL} target="_blank" rel="noreferrer"><Globe />Ver mi web</a>
      </nav>

      <section className="panel" id="negocios">
        <div className="panel-head">
          <h2>Negocios · {rows.length}</h2>
          <span className="muted">{active.filter((t) => t.kind !== "waiter").length} placas · {active.filter((t) => t.kind === "waiter").length} tarjetas activas</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty">
            <p>Aún no hay negocios. Crea el primero en 2 minutos.</p>
            <Link className="btn btn-dark" href="/admin/new">+ Nuevo negocio</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Negocio</th>
                  <th>Estado</th>
                  <th className="right">Toques 30d</th>
                  <th className="right">A Google</th>
                  <th className="right">Mensajes</th>
                  <th>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ business: b, stats: s }) => {
                  // Payment status when it matters (due soon, late, paused, test); otherwise the plain status.
                  const k = billOf.get(b.id)?.kind;
                  const billPill = k === "soon" || k === "late" || k === "suspended" || k === "trial" || k === "ended";
                  return (
                    <tr key={b.id} className="link">
                      <td>
                        <Link href={`/admin/b/${b.id}`} className="biz">
                          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
                          <span>
                            <b>{b.name}</b>
                            <small>{verticalByKey(b.kind).label}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{billPill ? <span className={`pill bill-${k}`}>{BILLING_LABEL[k]}</span> : <span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span>}</td>
                      <td className="right num">{s?.scans_30d ?? 0}</td>
                      <td className="right num">{s?.reviews_30d ?? 0}</td>
                      <td className="right num">{s?.feedback_30d ?? 0}</td>
                      <td className="muted">{ago(s?.last_event_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
