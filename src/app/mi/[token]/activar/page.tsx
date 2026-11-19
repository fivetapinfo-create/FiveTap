import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { branchesFor, staffFor } from "@/lib/staff";
import { activateRestaurant } from "../equipo/actions";

export const dynamic = "force-dynamic";

/** From sales demo to the restaurant's own system, in clear steps. */
export default async function ActivatePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  if (role !== "owner") notFound();
  const [staff, branches, d] = await Promise.all([staffFor(b.id), branchesFor(b.id), businessDetail(b.id)]);
  const demo = staff.filter((s) => s.is_demo), real = staff.filter((s) => !s.is_demo);
  const realReady = real.filter((s) => s.approved && s.active);
  const carded = new Set((d?.tags ?? []).filter((t) => t.active && t.staff_id).map((t) => t.staff_id));
  const steps = [
    { ok: Boolean(b.logo_url), t: "Logo oficial", h: "Aparece en la página, en la tarjeta de fidelidad y en el uniforme de los avatares." },
    { ok: Boolean(b.google_review_url), t: "Enlace de reseñas de Google", h: branches.length ? `${branches.length} sucursal(es) con su propia ficha.` : "El de tu negocio." },
    { ok: real.length > 0, t: "Tus meseros reales registrados", h: real.length ? `${real.length} registrados` : "Agrégalos en Equipo → Agregar meseros." },
    { ok: real.length > 0 && realReady.length === real.length, t: "Avatares revisados y aprobados", h: `${realReady.length} de ${real.length} aprobados` },
    { ok: realReady.length > 0 && realReady.every((s) => carded.has(s.id)), t: "Cada mesero con su tarjeta activa", h: `${realReady.filter((s) => carded.has(s.id)).length} de ${realReady.length} con tarjeta` },
  ];
  return (
    <div className="admin">
      <header className="admin-top"><div className="container"><Link href={`/mi/${token}`} className="owner-back">← Volver</Link><Logo size={20} /></div></header>
      <main className="container admin-main settings">
        <h1 className="owner-title">Activar mi restaurante</h1>
        {!b.is_demo ? (
          <p className="alert alert-ok">Tu restaurante ya está activado. No tiene datos de demostración.</p>
        ) : (
          <>
            <p className="muted">Ahora ves una demostración con meseros y evaluaciones de ejemplo. Al activar, tu FiveTap pasa a ser solo tuyo: tus meseros, tus avatares, tus placas.</p>
            {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
            <ol className="act-steps">{steps.map((x) => <li key={x.t} className={x.ok ? "ok" : undefined}><b>{x.ok ? "✓" : "•"} {x.t}</b><small>{x.h}</small></li>)}</ol>
            <form action={activateRestaurant} className="panel form-section">
              <input type="hidden" name="token" value={token} />
              {demo.length > 0 && (
                <fieldset className="act-keep">
                  <legend>Meseros de ejemplo: márcalos solo si quieres conservar alguno (empieza sin evaluaciones)</legend>
                  {demo.map((s) => <label key={s.id} className="check"><input type="checkbox" name="keep" value={s.id} /><span>{s.name}</span></label>)}
                </fieldset>
              )}
              <label className="check"><input type="checkbox" name="confirm" value="1" required /><span>Entiendo que se borran las evaluaciones de ejemplo y los meseros de ejemplo que no marqué. Mis datos reales no se tocan.</span></label>
              <SubmitButton className="btn btn-dark" pending="Activando…">Activar mi restaurante</SubmitButton>
              {!steps.every((x) => x.ok) && <small className="muted">Puedes activar ahora y completar lo pendiente después; nadie aparece a tus clientes hasta tener perfil aprobado y tarjeta activa.</small>}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
