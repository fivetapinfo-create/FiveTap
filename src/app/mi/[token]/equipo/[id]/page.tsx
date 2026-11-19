import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { AvatarEditor } from "@/components/AvatarEditor";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { rangeFrom } from "@/lib/periods";
import { ISSUES, branchesFor, buckets, ratingsFor, staffMember } from "@/lib/staff";
import { markRating, saveEmployee } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; id: string }>; searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; ok?: string; error?: string }> };
const when = (iso: string) => new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }).format(new Date(iso));
const avg = (l: { rating: number }[]) => (l.length ? Math.round((l.reduce((n, r) => n + r.rating, 0) / l.length) * 10) / 10 : null);

function Bars({ data, title }: { data: { label: string; n: number; avg: number | null }[]; title: string }) {
  return (
    <figure className="tp-chart" aria-label={title}>
      <figcaption>{title}</figcaption>
      <div className="tp-bars">
        {data.map((x) => (
          <div key={x.label} className="tp-col" title={x.avg !== null ? `${x.avg} ★ · ${x.n} evaluaciones` : "Sin evaluaciones"}>
            <span className="tp-colv">{x.avg !== null ? x.avg.toFixed(1) : ""}</span>
            <i style={{ height: `${x.avg !== null ? Math.max(6, (x.avg / 5) * 100) : 2}%` }} className={x.avg === null ? "none" : undefined} />
            <small>{x.label}</small><small className="tp-coln">{x.n || ""}</small>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** One employee: their numbers over time, every comment, their cards, and (for the owner) their profile and avatar. */
export default async function PersonPage({ params, searchParams }: Props) {
  const [{ token, id }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  if (!(await can(b, "team"))) notFound();
  const person = await staffMember(b.id, id);
  if (!person) notFound(); // never another business's employee
  const range = rangeFrom(sp);
  const yearAgo = new Date(Date.now() - 200 * 86_400_000).toISOString();
  const [all, team, d, branches] = await Promise.all([
    ratingsFor(b.id, { from: yearAgo, staffId: person.id }),
    ratingsFor(b.id, { from: range.from, to: range.to }),
    businessDetail(b.id),
    branchesFor(b.id),
  ]);
  const inRange = all.filter((r) => r.created_at >= range.from && (!range.to || r.created_at < range.to));
  const mine = avg(inRange), teamAvg = avg(team);
  const cards = (d?.tags ?? []).filter((t) => t.staff_id === person.id);
  const back = `/mi/${token}/equipo/${person.id}`;
  const owner = role === "owner";

  return (
    <div className="admin">
      <header className="admin-top"><div className="container"><Link href={`/mi/${token}/equipo`} className="owner-back">← Equipo</Link><Logo size={20} /></div></header>
      <main className="container admin-main settings tp">
        <h1 className="owner-title">{person.name}</h1>
        <p className="muted">{person.title}{person.active ? "" : " · Inactivo"} · Código {person.ref}</p>
        {sp.ok && <p className="alert alert-ok" role="status">Guardado.</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        <section className="glance-row tp-glance">
          <div><b className="num">{mine ?? "—"}</b><span>Su promedio · {range.label}</span></div>
          <div><b className="num">{inRange.length}</b><span>Evaluaciones</span></div>
          <div><b className="num">{teamAvg ?? "—"}</b><span>Promedio del equipo</span></div>
        </section>
        {mine !== null && teamAvg !== null && (
          <p className={`alert ${mine >= teamAvg ? "alert-ok" : "alert-warn"}`}>{mine >= teamAvg ? `Está ${(mine - teamAvg).toFixed(1)} sobre el promedio del equipo` : `Está ${(teamAvg - mine).toFixed(1)} bajo el promedio del equipo`} ({inRange.length} {inRange.length === 1 ? "evaluación" : "evaluaciones"}).</p>
        )}

        <section className="panel tp-charts">
          <Bars data={buckets(all, "week", 8)} title="Evolución semanal (últimas 8 semanas)" />
          <Bars data={buckets(all, "month", 6)} title="Evolución mensual (últimos 6 meses)" />
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Comentarios</h2><span className="muted">{inRange.filter((r) => r.comment || r.issue).length}</span></div>
          <ul className="tp-comments">
            {inRange.filter((r) => r.comment || r.issue).slice(0, 60).map((r) => (
              <li key={r.id} className={r.rating <= 2 ? "low" : undefined}>
                <span className="tp-stars" aria-label={`${r.rating} estrellas`}>{"★".repeat(r.rating)}<i>{"★".repeat(5 - r.rating)}</i></span>
                {r.issue && <b className="pill">{ISSUES[r.issue]}</b>}
                {r.comment && <p>“{r.comment}”</p>}
                <small className="muted">{when(r.created_at)} · {r.source === "waiter" ? "Desde su tarjeta" : "Desde la mesa"}{r.status === "resolved" ? " · Resuelto" : ""}</small>
                {r.status !== "resolved" && r.rating <= 3 && (
                  <form action={markRating}><input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="resolved" /><button className="btn btn-ghost btn-sm" type="submit">Marcar resuelto</button></form>
                )}
              </li>
            ))}
            {!inRange.some((r) => r.comment || r.issue) && <li className="empty"><p>Sin comentarios en este periodo.</p></li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Sus tarjetas</h2></div>
          <div className="msg"><p>{cards.length ? cards.map((t) => `${t.label} (${t.code})`).join(" · ") : "No tiene tarjeta asignada. Asígnala en Equipo → Placas y tarjetas."}</p></div>
        </section>

        {owner && (
          <section className="panel" id="perfil">
            <div className="panel-head"><h2>Perfil y avatar</h2></div>
            <form action={saveEmployee} className="form-section">
              <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} /><input type="hidden" name="id" value={person.id} />
              <AvatarEditor initial={person.avatar} logoUrl={b.logo_url} name={person.name} />
              <div className="grid-2">
                <label className="field"><span>Nombre</span><input className="input" name="name" defaultValue={person.name} required maxLength={50} /></label>
                <label className="field"><span>Puesto</span><input className="input" name="title" defaultValue={person.title} maxLength={30} /></label>
              </div>
              <label className="field"><span>Mensaje al cliente (lo dice su avatar)</span><input className="input" name="message" defaultValue={person.message ?? ""} maxLength={140} placeholder={`¡Hola! Soy ${person.name.split(" ")[0]}. ¿Cómo estuvo tu visita?`} /></label>
              {branches.length > 0 && <label className="field"><span>Sucursal</span><select className="select" name="branch_id" defaultValue={person.branch_id ?? ""}><option value="">Todas</option>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
              <label className="field"><span>Estado</span><select className="select" name="active" defaultValue={person.active ? "1" : "0"}><option value="1">Activo (aparece en “¿Quién te atendió?”)</option><option value="0">Inactivo (ya no trabaja aquí; su historial se guarda)</option></select></label>
              <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar</SubmitButton>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
