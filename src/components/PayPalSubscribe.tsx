"use client";

import { useEffect, useRef, useState } from "react";

type PayPal = {
  Buttons: (o: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void>; isEligible?: () => boolean };
};

let sdk: Promise<PayPal> | null = null;

/** Loads PayPal's script once for every button on the page. */
function loadSdk(clientId: string) {
  sdk ??= new Promise<PayPal>((ok, fail) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&locale=es_ES&disable-funding=credit,paylater`;
    s.dataset.sdkIntegrationSource = "button-factory";
    s.onload = () => ok((window as unknown as { paypal: PayPal }).paypal);
    s.onerror = () => {
      sdk = null;
      fail(new Error("paypal"));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

/**
 * PayPal subscription button: card or PayPal account, without leaving FiveTap.
 * Falls back to PayPal's own page if the script can't load.
 */
export function PayPalSubscribe({ clientId, planId, plan, business, fallbackUrl }: { clientId: string; planId: string; plan: "mensual" | "anual"; business?: string; fallbackUrl: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed" | "done">("loading");

  useEffect(() => {
    let alive = true;
    loadSdk(clientId)
      .then((paypal) => {
        if (!alive || !box.current) return;
        box.current.innerHTML = "";
        return paypal
          .Buttons({
            style: { shape: "pill", color: "black", layout: "vertical", label: "subscribe" },
            createSubscription: (_d: unknown, actions: { subscription: { create: (o: { plan_id: string }) => Promise<string> } }) =>
              actions.subscription.create({ plan_id: planId }),
            onApprove: async (data: { subscriptionID?: string }) => {
              setState("done");
              await fetch("/api/prueba", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId: data.subscriptionID, plan, business }),
              }).catch(() => {});
            },
          })
          .render(box.current)
          .then(() => alive && setState("ready"));
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [clientId, planId, plan, business]);

  if (state === "done") {
    return (
      <div className="alert alert-ok" role="status">
        <b>¡Listo! Tu prueba de 7 días empezó.</b> Hoy no se te cobró nada. Te escribimos por WhatsApp para dejarte tu placa NFC de prueba.
      </div>
    );
  }
  return (
    <div className="paypal-box">
      <div ref={box} />
      {state === "loading" && <p className="muted">Cargando pago seguro…</p>}
      {state === "failed" && (
        <a className="btn btn-dark" href={fallbackUrl} target="_blank" rel="noreferrer">Empezar prueba gratis · registrar tarjeta</a>
      )}
    </div>
  );
}
