import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { RefreshButton } from "@/components/RefreshButton";
import { accessRole } from "@/lib/access";
import { billingState } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { QUICK, rangeFrom } from "@/lib/periods";
import { ISSUES, branchesFor, buckets, ratingsFor, staffFor, topics } from "@/lib/staff";
import { db } from "@/lib/supabase";
import { markRating } from "../equipo/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; sucursal?: string; ok?: string }> };
const when = (iso: string) => new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }).format(new Date(iso));
const pct = (a: number, t: number) => (t ? Math.round((a / t) * 100) : 0);

/** Customer experience: what is working, what is not, and what needs attention now. */
export default async function ExperiencePage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const d = await businessDetail(b.id);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(home);
  const range = rangeFrom(sp);
  const branches = await branchesFor(b.id);
  const branch = branches.find((x) => x.id === sp.sucursal) ?? null;
  const hasTeam = await can(b, "team");
  const [ratings, staff, msgs] = await Promise.all([
    hasTeam ? ratingsFor(b.id, { from: range.from, to: range.to, branchId: branch?.id ?? null }) : Promise.resolve([]),
    hasTeam ? staffFor(b.id) : Promise.resolve([]),
    db().from("feedback").select("id, message, rating, created_at, resolved_at, tag_id, name").eq("business_id", b.id).gte("created_at", range.from).order("created_at", { ascending: false }).limit(2000),
  ]);
  const messages = ((msgs.data ?? []) as { id: string; message: string; rating: number | null; created_at: string; resolved_at: string | null; tag_id: string | null; name: string | null }[])
    .filter((m) => !range.to || m.created_at < range.to)
    .filter((m) => !branch || (d?.tags ?? []).some((t) => t.id === m.tag_id && t.branch_id === branch.id));
  const who = new Map(staff.map((s) => [s.id, s.name]));
  const label = new Map((d?.tags ?? []).map((t) => [t.id, t.label]));
  const total = ratings.length;
  const pos = ratings.filter((r) => r.rating >= 4).length, neg = ratings.filter((r) => r.rating <= 2).length;
  const avg = total ? Math.round((ratings.reduce((n, r) => n + r.rating, 0) / total) * 10) / 10 : null;
  const alerts = [
    ...ratings.filter((r) => (r.rating <= 2 || r.issue) && r.status !== "resolved").map((r) => ({ kind: "rating" as const, id: r.id, at: r.created_at, stars: r.rating, text: r.comment, issue: r.issue, who: r.staff_id ? who.get(r.staff_id) : null, where: r.tag_id ? label.get(r.tag_id) : null })),
    ...messages.filter((m) => !m.resolved_at).map((m) => ({ kind: "message" as const, id: m.id, at: m.created_at, stars: m.rating, text: m.message, issue: null, who: null, where: m.tag_id ? label.get(m.tag_id) : null })),
  ].sort((a, z) => z.at.localeCompare(a.at));
  const problems = topics(ratings, messages);
  const trend = buckets(ratings, "week", 8);
  const recent = ratings.filter((r) => r.comment).slice(0, 12);
  const back = `/mi/${token}/experiencia${sp.periodo ? `?periodo=${sp.periodo}` : ""}`;

  return (
    <div className="admin">
      <header className="admin-top"><div className="container"><Link href={home} className="owner-back">← Volver</Link><span className="row" style={{ gap: 10, alignItems: "center" }}><RefreshButton /><Logo size={20} /></span></div></header>
      <main className="container admin-main settings tp">
        <h1 className="owner-title">Experiencia del cliente</h1>
        <nav className="cl-tabs" aria-label="Periodo">
          {QUICK.map((x) => <Link key={x.key} href={`?periodo=${x.key}${branch ? `&sucursal=${branch.id}` : ""}`} className={range.key === x.key ? "on" : undefined}>{x.label}</Link>)}
        </nav>
        {branches.length > 1 && (
          <nav className="cl-tabs" aria-label="Sucursal" style={{ marginTop: 8 }}>
            <Link href={`?periodo=${range.key}`} className={!branch ? "on" : undefined}>Todas</Link>
            {branches.map((x) => <Link key={x.id} href={`?periodo=${range.key}&sucursal=${x.id}`} className={branch?.id === x.id ? "on" : undefined}>{x.name}</Link>)}
          </nav>
        )}

        <section className="glance-row tp-glance cx-kpis">
          <div><b className="num">{avg ?? "—"}</b><span>Satisfacción (★)</span></div>
          <div><b className="num cx-pos">{pct(pos, total)}%</b><span>Positivas · {pos}</span></div>
          <div><b className="num cx-neg">{pct(neg, total)}%</b><span>Negativas · {neg}</span></div>
          <div><b className="num">{alerts.length}</b><span>Por atender</span></div>
        </section>

        <section className="panel" id="atender">
          <div className="panel-head"><h2>Por atender</h2><span className="muted">Evaluaciones de 1–2★, problemas reportados y mensajes privados sin resolver</span></div>
          <ul className="tp-comments">
            {alerts.slice(0, 40).map((a) => (
              <li key={`${a.kind}-${a.id}`} className="low">
                {a.stars ? <span className="tp-stars">{"★".repeat(a.stars)}<i>{"★".repeat(5 - a.stars)}</i></span> : null}
                {a.issue && <b className="pill">{ISSUES[a.issue]}</b>}
                {a.text && <p>“{a.text}”</p>}
                <small className="muted">{when(a.at)}{a.who ? ` · ${a.who}` : ""}{a.where ? ` · ${a.where}` : ""}{a.kind === "message" ? " · Mensaje privado" : ""}</small>
                {a.kind === "rating" ? (
                  <form action={markRating}><input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="resolved" /><button className="btn btn-ghost btn-sm" type="submit">Marcar resuelto</button></form>
                ) : <Link className="btn btn-ghost btn-sm" href={`${home}#mensajes`}>Ver mensaje</Link>}
              </li>
            ))}
            {!alerts.length && <li className="empty"><p>Nada pendiente. Todo está en orden.</p></li>}
          </ul>
        </section>

        <section className="panel tp-charts">
          <figure className="tp-chart">
            <figcaption>Tendencia de satisfacción (últimas 8 semanas)</figcaption>
            <div className="tp-bars">
              {trend.map((x) => (
                <div key={x.label} className="tp-col"><span className="tp-colv">{x.avg !== null ? x.avg.toFixed(1) : ""}</span><i style={{ height: `${x.avg !== null ? Math.max(6, (x.avg / 5) * 100) : 2}%` }} className={x.avg === null ? "none" : undefined} /><small>{x.label}</small><small className="tp-coln">{x.n || ""}</small></div>
              ))}
            </div>
          </figure>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Problemas que se repiten</h2></div>
          {problems.length ? (
            <ul className="cx-topics">{problems.map((p) => <li key={p.key}><span>{p.label}</span><i><em style={{ width: `${(p.n / problems[0]!.n) * 100}%` }} /></i><b className="num">{p.n}</b></li>)}</ul>
          ) : <div className="empty"><p>Sin problemas repetidos en este periodo.</p></div>}
          <p className="muted tp-rule">Se cuentan los problemas que marcan los clientes y las palabras de sus comentarios y mensajes (demora, comida, atención, limpieza, cuenta…).</p>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Comentarios recientes</h2></div>
          <ul className="tp-comments">
            {recent.map((r) => (
              <li key={r.id} className={r.rating >= 4 ? "high" : r.rating <= 2 ? "low" : undefined}>
                <span className="tp-stars">{"★".repeat(r.rating)}<i>{"★".repeat(5 - r.rating)}</i></span>
                <p>“{r.comment}”</p>
                <small className="muted">{when(r.created_at)}{r.staff_id ? ` · ${who.get(r.staff_id) ?? ""}` : ""}</small>
              </li>
            ))}
            {!recent.length && <li className="empty"><p>Aún no hay comentarios.</p></li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
