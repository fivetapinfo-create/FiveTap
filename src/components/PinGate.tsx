import { BusinessLogo } from "./BusinessLogo";
import { Logo } from "./Logo";
import { unlockPin } from "@/app/mi/[token]/actions";
import type { Business } from "@/lib/types";

/** Asked once per phone when the venue set a PIN for FiveTap Business. */
export function PinGate({ b, token, wrong }: { b: Business; token: string; wrong?: boolean }) {
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container"><Logo size={20} /></div>
      </header>
      <main className="container admin-main pin-gate">
        <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
        <h1 className="owner-title">{b.name}</h1>
        <p className="muted">Escribe tu PIN de 4 dígitos. Este celular lo recordará.</p>
        <form action={unlockPin} className="pin-form">
          <input type="hidden" name="token" value={token} />
          <input className="input pin-input" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="one-time-code" required autoFocus aria-label="PIN" />
          {wrong && <p className="alert alert-warn">PIN incorrecto. Inténtalo otra vez.</p>}
          <button className="btn btn-dark btn-block" type="submit">Entrar</button>
        </form>
        <small className="muted">¿Lo olvidaste? Escríbele al Founder de FiveTap para quitarlo.</small>
      </main>
    </div>
  );
}
