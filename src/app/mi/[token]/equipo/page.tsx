import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { Upsell } from "@/components/Upsell";
import { accessRole } from "@/lib/access";
import { billingState } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { QUICK, rangeFrom } from "@/lib/periods";
import { MIN_RATINGS, branchesFor, googleClicksByStaff, rankStaff, ratingsFor, staffFor } from "@/lib/staff";
import { saveBranchAction, saveEmployee, savePlaque } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; sucursal?: string; ok?: string; error?: string }> };
const OK: Record<string, string> = { placa: "Placa actualizada.", sucursal: "Sucursal guardada.", estado: "Listo." };

/** Waiter performance: who is doing well, from how many ratings, and the team's cards and branches. */
export default async function TeamPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const top = <header className="admin-top"><div className="container"><Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link><Logo size={20} /></div></header>;
  if (!(await can(b, "team"))) return <div className="admin">{top}<main className="container admin-main settings"><h1 className="owner-title">Desempeño del equipo</h1><Upsell feature="team" token={token} /></main></div>;
  const d = await businessDetail(b.id);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(home);

  const range = rangeFrom(sp);
  const [branches, hasBranches] = await Promise.all([branchesFor(b.id), can(b, "branches")]);
  const branch = branches.find((x) => x.id === sp.sucursal) ?? null;
  const [staff, ratings, google] = await Promise.all([
    staffFor(b.id, { branchId: branch?.id ?? null }),
    ratingsFor(b.id, { from: range.from, to: range.to, branchId: branch?.id ?? null }),
    googleClicksByStaff(b.id, range.from, range.to),
  ]);
  const { rows, teamAvg, total } = rankStaff(staff.filter((s) => s.active), ratings, google);
  const inactive = staff.filter((s) => !s.active);
  const tags = (d?.tags ?? []).filter((t) => t.status !== "retired");
  const owner = role === "owner";
  const q = new URLSearchParams({ ...(sp.periodo ? { periodo: sp.periodo } : {}), ...(sp.desde ? { desde: sp.desde } : {}), ...(sp.hasta ? { hasta: sp.hasta } : {}), ...(branch ? { sucursal: branch.id } : {}) }).toString();
  const back = `/mi/${token}/equipo${q ? `?${q}` : ""}`;
  let pos = 0;

  return (
    <div className="admin">
      {top}
      <main className="container admin-main settings tp">
        <h1 className="owner-title">Desempeño del equipo</h1>
        {sp.ok && OK[sp.ok] && <p className="alert alert-ok" role="status">{OK[sp.ok]}</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        <form className="tp-filter" method="get">
          <nav className="cl-tabs" aria-label="Periodo">
            {QUICK.map((x) => <Link key={x.key} href={`?periodo=${x.key}${branch ? `&sucursal=${branch.id}` : ""}`} className={range.key === x.key ? "on" : undefined}>{x.label}</Link>)}
          </nav>
          <details className="tp-custom" open={range.key === "custom"}>
            <summary>Elegir fechas{range.key === "custom" ? ` · ${range.label}` : ""}</summary>
            <div className="grid-2">
              <label className="field"><span>Desde</span><input className="input" type="date" name="desde" defaultValue={sp.desde} /></label>
              <label className="field"><span>Hasta</span><input className="input" type="date" name="hasta" defaultValue={sp.hasta} /></label>
            </div>
            {branch && <input type="hidden" name="sucursal" value={branch.id} />}
            <button className="btn btn-dark btn-sm" type="submit">Ver</button>
          </details>
          {branches.length > 1 && (
            <nav className="cl-tabs" aria-label="Sucursal">
              <Link href={`?${new URLSearchParams({ ...(sp.periodo ? { periodo: sp.periodo } : {}) })}`} className={!branch ? "on" : undefined}>Todas</Link>
              {branches.map((x) => <Link key={x.id} href={`?${new URLSearchParams({ ...(sp.periodo ? { periodo: sp.periodo } : {}), sucursal: x.id })}`} className={branch?.id === x.id ? "on" : undefined}>{x.name}</Link>)}
            </nav>
          )}
        </form>

        <section className="glance-row tp-glance">
          <div><b className="num">{total}</b><span>Evaluaciones</span></div>
          <div><b className="num">{teamAvg ?? "—"}</b><span>Promedio del equipo</span></div>
          <div><b className="num">{rows.filter((r) => r.ranked).length}/{rows.length}</b><span>En el ranking</span></div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Ranking · {range.label}</h2></div>
          {rows.length === 0 ? (
            <div className="empty"><p>Aún no hay empleados. {owner ? "Agrégalos abajo y asígnales su tarjeta." : "El dueño los agrega desde aquí."}</p></div>
          ) : (
            <ol className="tp-rank">
              {rows.map((r) => {
                if (r.ranked) pos++;
                return (
                  <li key={r.staff.id}>
                    <Link href={`/mi/${token}/equipo/${r.staff.id}${q ? `?${q}` : ""}`} className="tp-row">
                      <span className={`tp-pos${r.ranked && pos <= 3 ? ` p${pos}` : ""}`}>{r.ranked ? pos : "–"}</span>
                      <span className="tp-who"><b>{r.staff.name}</b><small>{r.staff.title}{branch ? "" : r.staff.branch_id ? ` · ${branches.find((x) => x.id === r.staff.branch_id)?.name ?? ""}` : ""}</small></span>
                      <span className="tp-score">
                        <b>{r.avg !== null ? `★ ${r.avg.toFixed(1)}` : "Sin evaluaciones"}</b>
                        <small>{r.n === 1 ? "1 evaluación" : `${r.n} evaluaciones`}{r.ranked ? "" : r.n ? ` · necesita ${MIN_RATINGS}` : ""}</small>
                        {r.avg !== null && <i className="tp-bar"><em style={{ width: `${(r.avg / 5) * 100}%` }} />{teamAvg !== null && <s style={{ left: `${(teamAvg / 5) * 100}%` }} aria-label="Promedio del equipo" />}</i>}
                      </span>
                      <span className="tp-side">{r.google ? <small>{r.google} a Google</small> : null}{r.low ? <small className="tp-low">{r.low} baja{r.low === 1 ? "" : "s"}</small> : null}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="muted tp-rule">Cómo se ordena: por el promedio de estrellas, ajustado para que pocas evaluaciones no engañen (cuenta como si cada persona empezara con 5 evaluaciones en el promedio del equipo). Con menos de {MIN_RATINGS} evaluaciones en el periodo, la persona aparece sin puesto. La línea gris es el promedio del equipo. “A Google” son clientes que abrieron Google desde su tarjeta (no una reseña confirmada).</p>
        </section>

        {owner && (
          <section className="panel" id="empleados">
            <div className="panel-head"><h2>Agregar empleado</h2></div>
            <form action={saveEmployee} className="form-section">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="back" value={back} />
              <div className="grid-2">
                <label className="field"><span>Nombre</span><input className="input" name="name" required maxLength={50} placeholder="Ej.: Carla" /></label>
                <label className="field"><span>Puesto</span><input className="input" name="title" maxLength={30} defaultValue="Mesero" /></label>
              </div>
              {branches.length > 0 && (
                <label className="field"><span>Sucursal</span><select className="select" name="branch_id" defaultValue={branch?.id ?? ""}><option value="">Todas</option>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
              )}
              <SubmitButton className="btn btn-dark" pending="Guardando…">Agregar y personalizar su avatar</SubmitButton>
            </form>
            {inactive.length > 0 && <p className="muted" style={{ padding: "0 16px 16px" }}>Inactivos: {inactive.map((s, i) => <span key={s.id}>{i ? ", " : ""}<Link href={`/mi/${token}/equipo/${s.id}`}>{s.name}</Link></span>)}</p>}
          </section>
        )}

        <section className="panel" id="placas">
          <div className="panel-head"><h2>Placas y tarjetas</h2><span className="muted">{tags.length}</span></div>
          <p className="muted" style={{ padding: "0 16px" }}>Cada tarjeta de mesero apunta a una persona. Si se mezclan o alguien cambia de tarjeta, elige aquí a quién pertenece: su historial sigue con la persona, no con la tarjeta. El código está detrás de cada pieza.</p>
          <ul className="tp-plaques">
            {tags.map((t) => (
              <li key={t.id}>
                <form action={savePlaque} className="tp-plaque">
                  <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} /><input type="hidden" name="tag" value={t.id} />
                  <span className="tp-plaque-id"><b>{t.label}</b><small>{t.kind === "waiter" ? "Tarjeta de mesero" : "Placa de mesa"} · {t.code}</small></span>
                  {owner ? (
                    <>
                      {t.kind === "waiter" && (
                        <select className="select" name="staff_id" defaultValue={t.staff_id ?? ""} aria-label={`Persona de ${t.label}`}>
                          <option value="">Sin asignar</option>
                          {staff.filter((s) => s.active || s.id === t.staff_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                      {branches.length > 0 && (
                        <select className="select" name="branch_id" defaultValue={t.branch_id ?? ""} aria-label={`Sucursal de ${t.label}`}>
                          <option value="">Sin sucursal</option>
                          {branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                      )}
                      {(t.kind === "waiter" || branches.length > 0) && <SubmitButton className="btn btn-ghost btn-sm" pending="…">Guardar</SubmitButton>}
                    </>
                  ) : (
                    <small className="muted">{t.kind === "waiter" ? staff.find((s) => s.id === t.staff_id)?.name ?? "Sin asignar" : ""}</small>
                  )}
                </form>
              </li>
            ))}
          </ul>
        </section>

        {owner && hasBranches && (
          <section className="panel" id="sucursales">
            <div className="panel-head"><h2>Sucursales</h2></div>
            <p className="muted" style={{ padding: "0 16px" }}>Cada sucursal tiene su propia ficha en Google: pega aquí su enlace de reseñas y las placas de esa sucursal llevarán a la ficha correcta.</p>
            {branches.map((x) => (
              <form key={x.id} action={saveBranchAction} className="form-section tp-branch">
                <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} /><input type="hidden" name="id" value={x.id} />
                <div className="grid-2">
                  <label className="field"><span>Nombre</span><input className="input" name="name" defaultValue={x.name} required /></label>
                  <label className="field"><span>Dirección</span><input className="input" name="address" defaultValue={x.address ?? ""} /></label>
                </div>
                <label className="field"><span>Enlace de reseñas de Google de esta sucursal</span><input className="input" name="review" defaultValue={x.google_review_url ?? ""} placeholder="https://g.page/r/…/review" /></label>
                <SubmitButton className="btn btn-ghost btn-sm" pending="…">Guardar sucursal</SubmitButton>
              </form>
            ))}
            <form action={saveBranchAction} className="form-section tp-branch">
              <input type="hidden" name="token" value={token} /><input type="hidden" name="back" value={back} />
              <div className="grid-2">
                <label className="field"><span>Nueva sucursal</span><input className="input" name="name" required placeholder="Ej.: Sucursal Centro" /></label>
                <label className="field"><span>Dirección</span><input className="input" name="address" /></label>
              </div>
              <label className="field"><span>Enlace de reseñas de Google</span><input className="input" name="review" placeholder="https://g.page/r/…/review" /></label>
              <SubmitButton className="btn btn-dark btn-sm" pending="…">Agregar sucursal</SubmitButton>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
