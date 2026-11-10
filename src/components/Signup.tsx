"use client";

import { useRef, useState } from "react";
import { PayPalSubscribe, type SignupDetails } from "./PayPalSubscribe";

// Reads the ref, so PayPal's button (rendered once) always checks the latest values.
const isComplete = (d: SignupDetails) => d.venue.trim().length > 1 && d.owner.trim().length > 1 && d.phone.replace(/\D/g, "").length >= 7;

/**
 * Self sign-up: the venue leaves its name and WhatsApp, then subscribes on PayPal.
 * FiveTap saves the sign-up and notifies the founder, who only has to install.
 */
export function Signup({ clientId, planId, fallbackUrl, presetVenue }: { clientId?: string; planId?: string | null; fallbackUrl: string; presetVenue?: string }) {
  const [venue, setVenue] = useState(presetVenue ?? "");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"form" | "saving" | "done" | "error">("form");
  const latest = useRef<SignupDetails>({ venue, owner, phone });
  latest.current = { venue, owner, phone };
  const complete = isComplete(latest.current);

  async function save(subscriptionId?: string) {
    setState("saving");
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...latest.current, subscriptionId }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <div className="alert alert-ok" role="status">
        <b>¡Listo, {venue}! Tu plan quedó registrado.</b> Te escribimos por WhatsApp para coordinar el día de tu instalación.
      </div>
    );
  }

  return (
    <div className="signup">
      <label className="field">
        <span>Nombre del local</span>
        <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={80} placeholder="La Terraza" autoComplete="organization" required />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Tu nombre</span>
          <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={80} placeholder="Carlos Méndez" autoComplete="name" required />
        </label>
        <label className="field">
          <span>Tu WhatsApp</span>
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="6000-0000" autoComplete="tel" required />
        </label>
      </div>
      {!complete && <small className="muted">Completa tus datos para continuar con el pago.</small>}
      <div className={complete ? undefined : "signup-locked"} aria-disabled={!complete}>
        {clientId && planId ? (
          <PayPalSubscribe clientId={clientId} planId={planId} fallbackUrl={fallbackUrl} details={() => (isComplete(latest.current) ? latest.current : null)} onApproved={save} />
        ) : (
          <button type="button" className="btn btn-dark btn-block" disabled={!complete || state === "saving"} onClick={() => save()}>
            {state === "saving" ? "Guardando…" : "Registrarme y coordinar mi instalación"}
          </button>
        )}
      </div>
      {state === "error" && <p className="alert alert-error">No se pudo guardar. Revisa tu conexión e inténtalo otra vez.</p>}
    </div>
  );
}
