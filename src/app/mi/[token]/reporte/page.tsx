import type { Metadata } from "next";
import Link from "next/link";
import { AccessGate } from "@/components/AccessGate";
import { accessRole } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Logo } from "@/components/Logo";
import { billingState, human } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail, reportData, reviewSnapshots } from "@/lib/data";
import { successLine } from "@/lib/report-copy";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ mes?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Tu reporte · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

/**
 * The owner's monthly report, opened from the notification on the 1st: what happened
 * last month (or this month so far), the running total and a success line.
 */
export default async function MonthlyReport({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const detail = businessDetail(b.id);
  const [d, report, snapshots] = await Promise.all([detail, reportData(b.id, detail.then((x) => x?.tags ?? [])), reviewSnapshots(b.id)]);
  if (!d) notFound();
  const billing = billingState(b, d.payments);
  // Paused for a late payment: the home shows how to pay.
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(`/mi/${token}`);
  const key = sp.mes === "actual" ? "this" : "prev";
  const p = report.periods.find((x) => x.key === key)!;
  const before = snapshots[0];
  const latest = snapshots.length > 1 ? snapshots.at(-1)! : null;
  const rate = p.scans ? Math.min(100, Math.round((p.reviews / p.scans) * 100)) : 0;
  const home = `/mi/${token}`;

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back">← Mi resumen</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main" style={{ maxWidth: 720 }}>
        <div className="biz">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <div>
            <h1 className="owner-title">Tu reporte de {p.label}</h1>
            <p className="muted">{b.name}{key === "this" ? " · mes en curso" : ""}</p>
          </div>
        </div>

        <div className="seg report-seg" role="tablist">
          <Link href={`${home}/reporte`} replace role="tab" aria-selected={key === "prev"}>Mes pasado</Link>
          <Link href={`${home}/reporte?mes=actual`} replace role="tab" aria-selected={key === "this"}>Este mes</Link>
        </div>

        <section className="owner-hero">
          <span>Clientes que fueron a dejarte su reseña en Google</span>
          <b className="num">{p.reviews}</b>
          <p>{p.scans ? `${rate}% de los ${p.scans} clientes que tocaron tus placas.` : "Aún no hay toques en este período."}</p>
          <p className="report-success">{successLine(p, b.name)}</p>
        </section>

        <div className="kpis">
          <div className="kpi"><span>Toques</span><b className="num">{p.scans}</b></div>
          <div className="kpi"><span>Fueron a Google</span><b className="num">{p.reviews}</b></div>
          <div className="kpi"><span>Mensajes privados</span><b className="num">{p.feedback}</b></div>
          <div className="kpi"><span>Nuevos en el club</span><b className="num">{p.club}</b></div>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Acumulado con FiveTap</h2></div>
          <dl className="kv settings-kv">
            <dt>Clientes enviados a Google</dt>
            <dd className="num">{report.sinceReviews} en total</dd>
            {p.top && p.top.scans > 0 && (<><dt>Placa con más actividad</dt><dd>🏆 {p.top.label} ({p.top.scans} toques)</dd></>)}
            {before && (<><dt>Reseñas antes de FiveTap</dt><dd className="num">{before.reviews}{before.rating ? ` · ${before.rating.toFixed(1)} ★` : ""} <span className="muted">({human(before.taken_on)})</span></dd></>)}
            {latest && before && (
              <>
                <dt>Último conteo en Google</dt>
                <dd className="num">{latest.reviews}{latest.rating ? ` · ${latest.rating.toFixed(1)} ★` : ""} <span className="muted">({human(latest.taken_on)})</span>{latest.reviews > before.reviews ? <b> · +{latest.reviews - before.reviews} 🎉</b> : null}</dd>
              </>
            )}
          </dl>
          <div className="msg">
            <small className="muted">“Fueron a Google” son los clientes que abrieron tu página de reseñas desde una placa. Las reseñas publicadas las cuenta Google en tu perfil.</small>
          </div>
        </section>

        <Link className="btn btn-dark" href={home} style={{ justifySelf: "start" }}>Volver a mi resumen</Link>
      </main>
    </div>
  );
}
