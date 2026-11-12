import Link from "next/link";
import { BusinessLogo } from "@/components/BusinessLogo";
import { BILLING_LABEL, billingAll } from "@/lib/agenda";
import { listBusinesses, unreadCount } from "@/lib/data";
import { getPlans, planOf } from "@/lib/plans";
import { db } from "@/lib/supabase";
import { verticalByKey } from "@/lib/verticals";
import { Flash } from "./Flash";
import { STATUS_LABEL, pct, ago, usd } from "./format";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const month = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 7);
  const [rows, sp, billing, plans, tagRes, receiptRes, signupRes, unread] = await Promise.all([
    listBusinesses(),
    searchParams,
    billingAll(),
    getPlans(),
    db().from("tags").select("kind, active, business_id"),
    db().from("receipts").select("amount").eq("status", "paid").gte("paid_on", `${month}-01`),
    db().from("signups").select("id", { count: "exact", head: true }).is("business_id", null),
    unreadCount(),
  ]);
  const billOf = new Map(billing.map((r) => [r.business.id, r.billing]));
  const sum = (k: "scans_30d" | "reviews_30d" | "feedback_30d") =>
    rows.reduce((n, r) => n + Number(r.stats?.[k] ?? 0), 0);
  const paying = rows.filter((r) => r.business.status === "active");
  const mrr = paying.reduce((n, r) => n + Number(r.business.monthly_fee), 0);
  const kinds = ((tagRes.data ?? []) as { kind: string; active: boolean }[]).filter((t) => t.active);
  const collected = ((receiptRes.data ?? []) as { amount: number }[]).reduce((n, r) => n + Number(r.amount), 0);
  const owed = billing.filter((r) => r.billing.kind === "late" || r.billing.kind === "suspended");
  const soon = billing.filter((r) => r.billing.charge && r.billing.daysLate >= -7 && r.billing.daysLate <= 0 && !r.billing.blocked);
  const amount = (list: typeof billing) => list.reduce((n, r) => n + Number(r.billing.charge?.amount ?? 0), 0);
  const onPlan = plans.map((p) => ({ name: p.name.replace(/^FiveTap\s+/, ""), count: paying.filter((r) => planOf(r.business, plans)?.key === p.key).length }));
  const pending = (signupRes.count ?? 0) + rows.filter((r) => billOf.get(r.business.id)?.charge?.label === "primer pago").length;

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Founder</h1>
          <p>Tu negocio de un vistazo</p>
        </div>
      </div>

      <Flash ok={sp.ok} />

      <div className="kpis">
        <div className="kpi"><span>Clientes activos</span><b className="num">{paying.length}</b><small className="muted">{onPlan.map((p) => `${p.name} ${p.count}`).join(" · ")}</small></div>
        <div className="kpi"><span>Pendientes</span><b className="num">{pending}</b><small className="muted">registros web y sin primer pago</small></div>
        <div className="kpi"><span>Cobrado este mes</span><b className="num">{usd(collected)}</b><small className="muted">MRR {usd(mrr)}</small></div>
        <Link href="/admin/cobros" className="kpi"><span>Pagos pendientes</span><b className="num">{usd(amount(owed))}</b><small className="muted">{owed.length} moroso{owed.length === 1 ? "" : "s"} · {soon.length} vence{soon.length === 1 ? "" : "n"} en 7 días ({usd(amount(soon))})</small></Link>
        <div className="kpi"><span>Placas de mesa</span><b className="num">{kinds.filter((t) => t.kind !== "waiter").length}</b><small className="muted">activas, en todos los locales</small></div>
        <div className="kpi"><span>Tarjetas de meseros</span><b className="num">{kinds.filter((t) => t.kind === "waiter").length}</b><small className="muted">activas</small></div>
        <Link href="/admin/mensajes" className="kpi"><span>Mensajes sin leer</span><b className="num">{unread}</b><small className="muted">de clientes de los locales</small></Link>
      </div>

      <nav className="quick-links" aria-label="Secciones">
        {[["Agenda", "/admin/agenda"], ["Cobros", "/admin/cobros"], ["Comprobantes", "/admin/comprobantes"], ["Contratos", "/admin/contratos"], ["Planes", "/admin/planes"], ["Mensajes", "/admin/mensajes"], ["Empresa", "/admin/empresa"]].map(([l, h]) => (
          <Link key={h} href={h!} className="btn btn-ghost btn-sm">{l}</Link>
        ))}
      </nav>

      <h2 className="section-title">Negocios · últimos 30 días</h2>
      <div className="kpis">
        <div className="kpi"><span>Toques · 30 días</span><b className="num">{sum("scans_30d")}</b></div>
        <div className="kpi"><span>Fueron a Google</span><b className="num">{sum("reviews_30d")}</b></div>
        <div className="kpi"><span>Mensajes privados</span><b className="num">{sum("feedback_30d")}</b></div>
      </div>

      <section className="panel">
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
                  <th className="right">Toques 7d</th>
                  <th className="right">Toques 30d</th>
                  <th className="right">Fueron a Google</th>
                  <th className="right">Conversión</th>
                  <th className="right">Mensajes</th>
                  <th>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ business: b, stats: s }) => (
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
                    <td>
                      {(() => {
                        // Payment status when it matters (due soon, late, paused for it); otherwise the plain status.
                        const k = billOf.get(b.id)?.kind;
                        return k === "soon" || k === "late" || k === "suspended" || k === "trial" || k === "ended"
                          ? <Link href="/admin/cobros" className={`pill bill-${k}`}>{BILLING_LABEL[k]}</Link>
                          : <span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span>;
                      })()}
                    </td>
                    <td className="right num">{s?.scans_7d ?? 0}</td>
                    <td className="right num">{s?.scans_30d ?? 0}</td>
                    <td className="right num">{s?.reviews_30d ?? 0}</td>
                    <td className="right num">{pct(s?.reviews_30d, s?.scans_30d)}</td>
                    <td className="right num">{s?.feedback_30d ?? 0}</td>
                    <td className="muted">{ago(s?.last_event_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
