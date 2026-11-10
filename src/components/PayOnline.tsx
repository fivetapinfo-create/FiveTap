"use client";

import { useEffect, useRef, useState } from "react";
import { ONE_TIME_ITEMS, itemByKey } from "@/lib/catalog";
import { Receipt, type ReceiptData } from "./Receipt";

type Actions = {
  order: {
    create: (o: unknown) => Promise<string>;
    capture: () => Promise<{ id: string; payer?: { name?: { given_name?: string; surname?: string } } }>;
  };
};
type PayPal = { Buttons: (o: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void> } };

let sdk: Promise<PayPal> | null = null;

/** PayPal's script for one-time payments, loaded once under its own name. */
function loadSdk(clientId: string) {
  sdk ??= new Promise<PayPal>((ok, fail) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&locale=es_ES&disable-funding=credit,paylater,venmo`;
    s.dataset.namespace = "paypalOrders";
    s.onload = () => ok((window as unknown as { paypalOrders: PayPal }).paypalOrders);
    s.onerror = () => {
      sdk = null;
      fail(new Error("paypal"));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

/** Pick what to buy, say for which business, pay with PayPal, and the receipt prints. */
export function PayOnline({ clientId, presetVenue }: { clientId: string; presetVenue?: string }) {
  const [itemKey, setItemKey] = useState(ONE_TIME_ITEMS[0]!.key);
  const [venue, setVenue] = useState(presetVenue ?? "");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef({ itemKey, venue });
  latest.current = { itemKey, venue };
  const item = itemByKey(itemKey)!;

  useEffect(() => {
    let alive = true;
    loadSdk(clientId)
      .then((paypal) => {
        if (!alive || !box.current) return;
        box.current.innerHTML = "";
        return paypal
          .Buttons({
            style: { shape: "pill", color: "black", layout: "vertical", label: "pay" },
            onClick: (_d: unknown, actions: { resolve: () => void; reject: () => void }) =>
              latest.current.venue.trim().length > 1 ? actions.resolve() : actions.reject(),
            createOrder: (_d: unknown, actions: Actions) => {
              const it = itemByKey(latest.current.itemKey)!;
              return actions.order.create({
                purchase_units: [{ description: `FiveTap · ${it.name} · ${latest.current.venue.trim()}`.slice(0, 127), amount: { currency_code: "USD", value: it.amount.toFixed(2) } }],
                application_context: { shipping_preference: "NO_SHIPPING", brand_name: "FiveTap" },
              });
            },
            onApprove: async (_d: unknown, actions: Actions) => {
              const done = await actions.order.capture();
              const it = itemByKey(latest.current.itemKey)!;
              const v = latest.current.venue.trim();
              const payer = [done.payer?.name?.given_name, done.payer?.name?.surname].filter(Boolean).join(" ");
              setReceipt({ item: it.name, detail: it.detail, amount: it.amount, venue: v, order: done.id, paidWith: "PayPal" });
              fetch("/api/compra", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: done.id, item: it.key, venue: v, payer }) }).catch(() => {});
            },
          })
          .render(box.current)
          .then(() => alive && setState("ready"));
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (receipt) return <Receipt data={receipt} />;

  return (
    <div className="signup">
      <label className="field">
        <span>¿Qué compras?</span>
        <select className="select" value={itemKey} onChange={(e) => setItemKey(e.target.value)}>
          {ONE_TIME_ITEMS.map((i) => (
            <option key={i.key} value={i.key}>{i.name} · ${i.amount.toLocaleString("en-US")}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Nombre de tu negocio</span>
        <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={80} placeholder="La Terraza" autoComplete="organization" required />
      </label>
      <p className="pay-total">Total: <b className="num">${item.amount.toLocaleString("en-US")}</b> <span className="muted">· {item.detail}</span></p>
      <div className={venue.trim().length > 1 ? undefined : "signup-locked"}>
        <div ref={box} />
        {state === "loading" && <p className="muted">Cargando pago seguro…</p>}
      </div>
      {venue.trim().length <= 1 && <small className="muted">Escribe el nombre de tu negocio para pagar.</small>}
      {state === "failed" && <p className="muted">No se pudo cargar PayPal. Usa los enlaces de abajo o Yappy.</p>}
    </div>
  );
}
