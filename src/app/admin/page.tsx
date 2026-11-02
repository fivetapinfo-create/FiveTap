import Link from "next/link";
import { BusinessLogo } from "@/components/BusinessLogo";
import { listBusinesses } from "@/lib/data";
import { verticalByKey } from "@/lib/verticals";
import { Flash } from "./Flash";
import { STATUS_LABEL, pct, ago, usd } from "./format";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [rows, sp] = await Promise.all([listBusinesses(), searchParams]);
  const sum = (k: "scans_30d" | "reviews_30d" | "feedback_30d") =>
    rows.reduce((n, r) => n + Number(r.stats?.[k] ?? 0), 0);
  const paying = rows.filter((r) => r.business.status === "active");
  const mrr = paying.reduce((n, r) => n + Number(r.business.monthly_fee), 0);

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Negocios</h1>
          <p>Últimos 30 días</p>
        </div>
      </div>

      <Flash ok={sp.ok} />

      <div className="kpis">
        <div className="kpi"><span>MRR</span><b className="num">{usd(mrr)}</b></div>
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
                    <td><span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span></td>
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
