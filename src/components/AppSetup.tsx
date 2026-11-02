"use client";

import { useEffect, useState } from "react";

type BeforeInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied" | "working" | "error";
type Role = { value: string; label: string; hint: string };

const ROLE_KEY = "ft-push-role";

function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/**
 * Installs FiveTap as an app on the phone and turns on its notifications.
 * iPhone only allows notifications once the app is on the home screen, and keeps
 * that app's storage apart from Safari: the role comes in the URL (`initialRole`).
 */
export function AppSetup({
  endpoint,
  benefits,
  roles,
  initialRole,
  guided = false,
  compactWhenOn = false,
}: {
  endpoint: string;
  benefits: string[];
  roles?: Role[];
  initialRole?: string;
  /** Opened from the install QR or link: walk the person through it. */
  guided?: boolean;
  /** Once notifications are on, shrink to one line. */
  compactWhenOn?: boolean;
}) {
  const [state, setState] = useState<State>("loading");
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPrompt | null>(null);
  const [role, setRole] = useState(initialRole ?? roles?.[0]?.value ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setInstalled(standalone);
    setIos(isIos);
    // Instagram, Facebook, WhatsApp and other in-app browsers can't install apps.
    setInApp(!standalone && (/FBAN|FBAV|Instagram|Line\/|WhatsApp|; wv\)/i.test(ua) || (isIos && !/Safari\//.test(ua))));
    if (!initialRole) {
      try {
        const saved = localStorage.getItem(ROLE_KEY);
        if (saved && roles?.some((r) => r.value === saved)) setRole(saved);
      } catch {}
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    (async () => {
      if (!("serviceWorker" in navigator)) return setState("unsupported");
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!reg || !("PushManager" in window) || !("Notification" in window)) return setState(isIos && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })();
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "") }));
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), role }) });
      if (!res.ok) throw new Error(String(res.status));
      try {
        localStorage.setItem(ROLE_KEY, role);
      } catch {}
      setState("on");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("working");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState("off");
  }

  const roleLabel = roles?.find((r) => r.value === role)?.label;

  if (state === "on" && compactWhenOn) {
    return (
      <div className="app-on" id="app">
        <span>🔔 Avisos activos en este celular{roleLabel ? ` · ${roleLabel}` : ""}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={disable}>Desactivar</button>
      </div>
    );
  }

  const lastStep = installed && state !== "on";
  const canAsk = state === "off" || state === "error" || state === "working";

  return (
    <section className={`panel app-setup${guided || lastStep ? " app-setup-guided" : ""}`} id="app">
      <div className="panel-head">
        <h2>{lastStep ? "Último paso: activa los avisos" : guided && !installed ? "Instala FiveTap en tu celular" : "📲 FiveTap en tu celular"}</h2>
        {state === "on" && <span className="pill active">Notificaciones activas</span>}
      </div>
      <div className="app-setup-body">
        {state !== "on" && !lastStep && (
          <ul className="app-benefits">
            {benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}

        {!installed && inApp ? (
          <div className="app-inapp">
            <p>
              <b>Ábrelo en {ios ? "Safari" : "Chrome"}</b> para instalarlo: toca <b>{ios ? "⋯ o el ícono de brújula" : "⋮"}</b> y elige{" "}
              <b>“Abrir en {ios ? "Safari" : "Chrome"}”</b>. O copia el enlace y pégalo allí.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(location.href).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Enlace copiado ✓" : "Copiar enlace"}
            </button>
          </div>
        ) : !installed && ios ? (
          <ol className="app-steps">
            <li>Toca <b>Compartir</b> <span className="share-glyph" aria-hidden>⬆︎</span> en la barra de Safari{guided ? " (abajo)" : ""}.</li>
            <li>Baja y elige <b>“Agregar a pantalla de inicio”</b> → <b>Agregar</b>.</li>
            <li>Abre <b>FiveTap</b> desde el ícono blanco y activa los avisos.</li>
          </ol>
        ) : !installed && prompt ? (
          <button type="button" className="btn btn-dark btn-lg" onClick={async () => { await prompt.prompt(); setPrompt(null); }}>
            Instalar FiveTap
          </button>
        ) : !installed ? (
          <p className="muted">Para tenerla como app: toca el menú <b>⋮</b> de Chrome → <b>“Instalar app”</b> o <b>“Agregar a pantalla principal”</b>. Luego ábrela desde el ícono blanco.</p>
        ) : null}

        {canAsk && (installed || !ios) && (
          <>
            {roles && (
              <div className="chips-pick" role="radiogroup" aria-label="¿Quién usa este celular?">
                {roles.map((r) => (
                  <label key={r.value} className={`pick${r.value === role ? " on" : ""}`}>
                    <input type="radio" name="push-role" value={r.value} checked={r.value === role} onChange={() => setRole(r.value)} />
                    {r.label}
                  </label>
                ))}
              </div>
            )}
            {roles && <small className="muted">{roles.find((r) => r.value === role)?.hint}</small>}
            <button type="button" className="btn btn-dark btn-lg" onClick={enable} disabled={state === "working"}>
              {state === "working" ? "Activando…" : "🔔 Activar avisos"}
            </button>
            {state === "error" && <p className="alert alert-error">No se pudo activar. Revisa tu conexión e inténtalo otra vez.</p>}
          </>
        )}
        {state === "on" && (
          <div className="row">
            <span className="muted">Este celular recibe los avisos de FiveTap.</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={disable}>Desactivar</button>
          </div>
        )}
        {state === "denied" && (
          <p className="alert alert-warn">Los avisos están bloqueados. Actívalos en <b>Ajustes → Notificaciones → FiveTap</b> (o en los permisos del navegador) y vuelve a abrir la app.</p>
        )}
        {state === "unsupported" && !inApp && <p className="muted">Este navegador no permite avisos. Usa Chrome en Android o Safari en iPhone.</p>}
      </div>
      {guided && ios && !installed && !inApp && (
        <div className="share-hint" aria-hidden>
          Toca <b>Compartir</b> aquí abajo
          <span className="share-arrow">↓</span>
        </div>
      )}
    </section>
  );
}
