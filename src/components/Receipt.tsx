"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

export type ReceiptData = {
  /** What was bought, e.g. "Plan mensual". */
  item: string;
  /** Second line under the item, e.g. "10 placas · FiveTap Business". */
  detail: string;
  amount: number;
  /** "/ mes" for subscriptions; empty for one-time purchases. */
  per?: string;
  venue: string;
  order: string;
  paidWith: string;
};

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Bars that look like a barcode, always the same for the same order number. */
function Barcode({ code }: { code: string }) {
  const bars: number[] = [];
  let seed = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  for (let i = 0; i < 46; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    bars.push(1 + (seed % 3));
  }
  return (
    <div className="rc-barcode" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} style={{ width: w, marginRight: i % 2 ? 2 : 1 }} />
      ))}
    </div>
  );
}

/**
 * Payment confirmation: a small printer that prints the receipt. Processing, then
 * printing (the paper slides out of the slot), then a green check. ~5 seconds.
 */
export function Receipt({ data }: { data: ReceiptData }) {
  const [stage, setStage] = useState<"processing" | "printing" | "done">("processing");
  const date = new Intl.DateTimeFormat("es-PA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Panama" })
    .format(new Date())
    .toUpperCase();

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setStage("done");
    const a = setTimeout(() => setStage("printing"), 1300);
    const b = setTimeout(() => setStage("done"), 4600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const status = { processing: "Procesando tu pago", printing: "Imprimiendo tu recibo", done: "¡Pago completado!" }[stage];

  return (
    <div className="rc" role="status" aria-live="polite">
      <div className="rc-printer">
        <div className="rc-top">
          <LogoMark size={22} className="rc-mark" />
          <Link href="/" className="rc-home">Inicio</Link>
        </div>
        <div className="rc-screen">
          <div className="rc-screen-row">
            <div>
              <b>{data.item}</b>
              <span>{data.detail}</span>
            </div>
            <div className="rc-total">
              <span>Total</span>
              <b className="num">{money(data.amount)}</b>
            </div>
          </div>
          <p className={`rc-status rc-${stage}`}>
            {stage === "done" ? <span className="rc-check" aria-hidden>✓</span> : <span className="rc-spin" aria-hidden />}
            {status}
          </p>
        </div>
        <div className="rc-slot" />
      </div>

      <div className="rc-paper-wrap">
        <div className={`rc-paper rc-paper-${stage}`}>
          <div className="rc-logo"><LogoMark size={26} /></div>
          <p className="rc-brand">FIVETAP</p>
          <hr />
          <div className="rc-line">
            <span>{data.item.toUpperCase()}</span>
            <span>{money(data.amount)}</span>
          </div>
          <p className="rc-sub">{data.detail}</p>
          <hr />
          <div className="rc-line"><span>Subtotal</span><span>{money(data.amount)}</span></div>
          <div className="rc-line rc-big"><span>TOTAL PAGADO</span><span>{money(data.amount)}{data.per ? ` ${data.per}` : ""}</span></div>
          <hr />
          <div className="rc-meta">
            <span>Negocio</span><span>{data.venue}</span>
            <span>Pedido</span><span>{data.order}</span>
            <span>Pagado con</span><span>{data.paidWith}</span>
            <span>Fecha</span><span>{date}</span>
          </div>
          <hr />
          <p className="rc-thanks">¡Bienvenido a FiveTap, {data.venue}! Tus clientes felices ahora te dejan sus reseñas. 🚀</p>
          <Barcode code={data.order} />
          <p className="rc-code">{data.order}</p>
        </div>
      </div>
    </div>
  );
}
