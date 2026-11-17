import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { SubmitButton } from "@/components/SubmitButton";
import { can } from "@/lib/entitlements";
import { cardByToken, programFor, stampRole } from "@/lib/loyalty-cards";
import { authorizeStamping, stampCard } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sellar tarjeta", robots: { index: false, follow: false } };

const OK: Record<string, string> = {
  listo: "Listo: este teléfono ya puede sellar las tarjetas del negocio.",
  sello: "Sello agregado.",
  completa: "Sello agregado. ¡La tarjeta está completa! Entrega el premio.",
  canjeado: "Premio entregado. La tarjeta empieza otra vez.",
};

/** Opened by the staff when they scan a customer's card with the phone camera. */
export default async function StampPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const card = await cardByToken(token);
  if (!card) notFound();
  const b = card.business;
  const [role, program, allowed] = await Promise.all([stampRole(b), programFor(b.id), can(b, "loyalty")]);
  const full = card.stamps >= program.stamps_needed;

  return (
    <main className="guest">
      <div className="guest-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <span className="guest-name">{b.name}</span>
        </div>
        <h1 className="guest-title">Tarjeta de {card.name}</h1>
        {sp.ok && OK[sp.ok] && <p className="alert alert-ok" role="status">{OK[sp.ok]}</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        {!role ? (
          <form action={authorizeStamping} className="guest-form">
            <input type="hidden" name="token" value={token} />
            <p className="guest-lead">Solo el personal de {b.name} puede sellar. La primera vez, este teléfono pide el acceso de FiveTap Business; después sella al instante.</p>
            {b.password_required ? (
              <>
                <label className="field"><span>Usuario</span><input className="input" name="username" required autoComplete="username" autoCapitalize="none" /></label>
                <label className="field"><span>Contraseña</span><input className="input" name="password" type="password" required autoComplete="current-password" /></label>
              </>
            ) : (
              <label className="field"><span>Código de acceso (6 dígitos)</span><input className="input pin-input" name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" /></label>
            )}
            <SubmitButton className="btn btn-dark btn-block" pending="Verificando…">Activar este teléfono</SubmitButton>
            <small className="muted">¿Eres cliente? Esta página es para el personal. Tu tarjeta está en el enlace que guardaste.</small>
          </form>
        ) : !allowed || !program.enabled ? (
          <p className="alert alert-warn">La tarjeta de fidelidad está apagada en este negocio. Actívala en FiveTap Business → Fidelidad.</p>
        ) : (
          <section className="panel lc-stampbox">
            <div className="lc-count"><b className="num">{card.stamps}</b><span>de {program.stamps_needed} sellos</span></div>
            <ol className="lc-preview" aria-hidden="true">
              {Array.from({ length: program.stamps_needed }, (_, k) => <li key={k} className={k < card.stamps ? "on" : undefined} />)}
            </ol>
            <p className="muted">Premio: <b>{program.reward}</b>{card.rewards ? ` · Premios recibidos: ${card.rewards}` : ""}</p>
            <form action={stampCard} className="lc-stamp-actions">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="op" value={full ? "redeem" : "stamp"} />
              <SubmitButton className="btn btn-dark btn-block" pending={full ? "Guardando…" : "Sellando…"}>{full ? "Entregar premio y reiniciar" : "Agregar sello"}</SubmitButton>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
