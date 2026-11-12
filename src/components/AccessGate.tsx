import { BusinessLogo } from "./BusinessLogo";
import { Logo } from "./Logo";
import { unlockAccess } from "@/app/mi/[token]/actions";
import type { Business } from "@/lib/types";

/**
 * FiveTap Business is private: the link alone does not open it. Each phone asks once for
 * the owner's or the manager's 6-digit code, then remembers it.
 */
export function AccessGate({ b, token, error, install }: { b: Business; token: string; error?: string; install?: boolean }) {
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container"><Logo size={20} /></div>
      </header>
      <main className="container admin-main pin-gate">
        <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
        <h1 className="owner-title">{b.name}</h1>
        <p className="muted">Acceso privado para el dueño y el gerente. Escribe tu código de 6 dígitos; este celular lo recordará.</p>
        <form action={unlockAccess} className="pin-form">
          <input type="hidden" name="token" value={token} />
          {install && <input type="hidden" name="instalar" value="1" />}
          <input className="input pin-input" name="code" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required autoFocus aria-label="Código de acceso" />
          {error === "mal" && <p className="alert alert-warn">Código incorrecto. Revisa el que te dio FiveTap.</p>}
          {error === "bloqueado" && <p className="alert alert-error">Demasiados intentos. Por seguridad, espera 15 minutos e inténtalo otra vez.</p>}
          <button className="btn btn-dark btn-block" type="submit">Entrar</button>
        </form>
        <small className="muted">¿No tienes tu código? Pídeselo al Founder de FiveTap o al dueño del local.</small>
      </main>
    </div>
  );
}
