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
export type SignupDetails = { venue: string; owner: string; phone: string };

export function PayPalSubscribe({
  clientId,
  planId,
  fallbackUrl,
  details,
  onApproved,
}: {
  clientId: string;
  planId: string;
  fallbackUrl: string;
  /** Latest form values, read when the button is tapped; null while the form is incomplete. */
  details: () => SignupDetails | null;
  onApproved: (subscriptionId: string | undefined) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    loadSdk(clientId)
      .then((paypal) => {
        if (!alive || !box.current) return;
        box.current.innerHTML = "";
        return paypal
          .Buttons({
            style: { shape: "pill", color: "black", layout: "vertical", label: "subscribe" },
            // Don't open PayPal until the venue's name and WhatsApp are filled in.
            onClick: (_d: unknown, actions: { resolve: () => void; reject: () => void }) => (details() ? actions.resolve() : actions.reject()),
            createSubscription: (_d: unknown, actions: { subscription: { create: (o: { plan_id: string }) => Promise<string> } }) =>
              actions.subscription.create({ plan_id: planId }),
            onApprove: async (data: { subscriptionID?: string }) => onApproved(data.subscriptionID),
          })
          .render(box.current)
          .then(() => alive && setState("ready"));
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the buttons render once; details() reads the latest values
  }, [clientId, planId]);

  return (
    <div className="paypal-box">
      <div ref={box} />
      {state === "loading" && <p className="muted">Cargando pago seguro…</p>}
      {state === "failed" && (
        <a className="btn btn-dark" href={fallbackUrl} target="_blank" rel="noreferrer">Suscribirme con PayPal</a>
      )}
    </div>
  );
}
