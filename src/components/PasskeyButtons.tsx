"use client";

import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";

const call = async (body: Record<string, unknown>) => {
  const r = await fetch("/api/founder/passkey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error ?? "No se pudo completar.");
  return data;
};

const FaceIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 16a4 4 0 0 0 5 0" />
  </svg>
);

/** "Entrar con Face ID": the device proves it is the founder; no password typed. */
export function PasskeyLogin({ next, auto = false }: { next: string; auto?: boolean }) {
  const [state, setState] = useState<"idle" | "working" | "error" | "unsupported">("idle");
  const [msg, setMsg] = useState("");
  const run = async (silent: boolean) => {
    setState("working"); setMsg("");
    try {
      const options = await call({ step: "login-options" });
      const response = await startAuthentication({ optionsJSON: options });
      await call({ step: "login-verify", response });
      window.location.assign(next);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      // When Face ID was opened on its own and the phone did not allow it, just wait for the tap.
      if (silent && /NotAllowed|cancel|abort|gesture|activation/i.test(m)) { setState("idle"); return; }
      setMsg(/NotAllowed|cancel|abort/i.test(m) ? "Cancelaste la verificación. Inténtalo otra vez." : m || "No se pudo entrar.");
      setState("error");
    }
  };
  useEffect(() => {
    if (!browserSupportsWebAuthn()) { setState("unsupported"); return; }
    // Face ID opens by itself once the entrance animation (if any) has finished.
    if (!auto) return;
    const playing = document.documentElement.getAttribute("data-ft-intro-founder") === "play";
    const t = setTimeout(() => void run(true), playing ? 4400 : 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (state === "unsupported") return null;
  return (
    <div className="pk-login">
      <button
        type="button"
        className="btn btn-dark btn-block pk-btn"
        disabled={state === "working"}
        onClick={() => void run(false)}
      >
        <FaceIcon /> {state === "working" ? "Verificando…" : "Entrar con Face ID o huella"}
      </button>
      {msg && <p className="alert alert-error" role="alert">{msg}</p>}
    </div>
  );
}

/** Adds this phone or computer as a passkey (only from inside the panel). */
export function PasskeyAdd() {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error" | "unsupported">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!browserSupportsWebAuthn()) setState("unsupported");
    setName(/iPhone/.test(navigator.userAgent) ? "iPhone" : /iPad/.test(navigator.userAgent) ? "iPad" : /Android/.test(navigator.userAgent) ? "Android" : /Mac/.test(navigator.userAgent) ? "Mac" : "Computadora");
  }, []);
  if (state === "unsupported") return <p className="alert alert-warn">Este navegador no admite llaves de acceso. Ábrelo en Safari (iPhone) o Chrome actualizado.</p>;
  return (
    <div className="pk-add">
      <label className="field"><span>Nombre de este dispositivo</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
      <button
        type="button"
        className="btn btn-dark pk-btn"
        disabled={state === "working"}
        onClick={async () => {
          setState("working"); setMsg("");
          try {
            const options = await call({ step: "register-options" });
            const response = await startRegistration({ optionsJSON: options });
            await call({ step: "register-verify", response, name });
            setState("done"); setMsg("Listo: la próxima vez entra con Face ID o tu huella.");
            setTimeout(() => window.location.reload(), 1200);
          } catch (e) {
            const m = e instanceof Error ? e.message : "";
            setMsg(/InvalidState|excluded|already/i.test(m) ? "Este dispositivo ya tiene una llave de acceso." : /NotAllowed|cancel|abort/i.test(m) ? "Cancelaste la verificación." : m || "No se pudo agregar.");
            setState("error");
          }
        }}
      >
        <FaceIcon /> {state === "working" ? "Esperando tu Face ID…" : "Agregar este dispositivo"}
      </button>
      {msg && <p className={`alert ${state === "done" ? "alert-ok" : "alert-error"}`} role="status">{msg}</p>}
    </div>
  );
}
