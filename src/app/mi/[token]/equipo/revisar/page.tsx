import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { AvatarPicture } from "@/components/AvatarPicture";
import { Logo } from "@/components/Logo";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { staffFor } from "@/lib/staff";
import { reviewStaff } from "../actions";

export const dynamic = "force-dynamic";

/** The automatic avatars, waiting for the owner's approval before guests see them. */
export default async function ReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  if (!(await can(b, "team")) || role !== "owner") notFound();
  const [all, d] = await Promise.all([staffFor(b.id), businessDetail(b.id)]);
  const pending = all.filter((s) => !s.approved);
  const free = (d?.tags ?? []).filter((t) => t.status !== "retired" && t.active && !t.staff_id);
  const H = ({ id, op, children, extra }: { id: string; op: string; children: React.ReactNode; extra?: Record<string, string> }) => (
    <form action={reviewStaff}>
      <input type="hidden" name="token" value={token} /><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );

  return (
    <div className="admin">
      <header className="admin-top"><div className="container"><Link href={`/mi/${token}/equipo`} className="owner-back">← Equipo</Link><Logo size={20} /></div></header>
      <main className="container admin-main settings">
        <h1 className="owner-title">Revisar avatares</h1>
        <p className="muted">Cada persona recibió un avatar automático con tu uniforme y tu logo. Si alguno no te convence, toca “Otro avatar”. Cuando estén bien, apruébalos.</p>
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
        {!pending.length ? (
          <div className="panel"><div className="empty"><p>No hay avatares pendientes. <Link href={`/mi/${token}/equipo`}>Volver a Equipo</Link></p></div></div>
        ) : (
          <>
            <H id="" op="approve-all"><button className="btn btn-dark" type="submit">Aprobar los {pending.length}</button></H>
            <ul className="rv-grid">
              {pending.map((s) => {
                const card = (d?.tags ?? []).find((t) => t.staff_id === s.id);
                return (
                  <li key={s.id} id={`p-${s.id}`} className="rv-card">
                    <span className="rv-pic"><AvatarPicture config={s.avatar} logoUrl={b.logo_url} alt={s.name} /></span>
                    <b>{s.name}</b>
                    <small className="muted">{s.title}</small>
                    <div className="rv-row">
                      <H id={s.id} op="body" extra={{ body: s.avatar.body === "m" ? "f" : "m" }}><button className="btn btn-ghost btn-sm" type="submit">{s.avatar.body === "m" ? "Hacer mesera" : "Hacer mesero"}</button></H>
                      <H id={s.id} op="regenerate"><button className="btn btn-ghost btn-sm" type="submit">Otro avatar</button></H>
                    </div>
                    <H id={s.id} op="card">
                      <select className="select" name="tag" defaultValue={card?.id ?? ""} aria-label={`Tarjeta de ${s.name}`}>
                        <option value="">{card ? card.label : "Asignar tarjeta…"}</option>
                        {free.map((t) => <option key={t.id} value={t.id}>{t.label} · {t.code}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-sm" type="submit">Asignar</button>
                    </H>
                    <small className="muted">{card ? `Tarjeta: ${card.label}` : b.is_demo ? "En la demostración no necesita tarjeta" : "Sin tarjeta: no aparecerá a los clientes hasta tener una"}</small>
                    <H id={s.id} op="approve"><button className="btn btn-dark btn-block" type="submit">Aprobar</button></H>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
