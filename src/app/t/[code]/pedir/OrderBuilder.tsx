"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Copy } from "@/lib/i18n";
import { sendOrder } from "./actions";

type Item = { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null };

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Send({ label, pending, disabled }: { label: string; pending: string; disabled: boolean }) {
  const s = useFormStatus();
  return <button type="submit" className="btn btn-dark btn-block ob-send" disabled={disabled || s.pending}>{s.pending ? pending : label}</button>;
}

/** The guest's cart: tap + and −, see the total, write a name and send. Prices are re-checked on the server. */
export function OrderBuilder({ items, copy, code, needWhere, error, lang }: { items: Item[]; copy: Copy; code: string; needWhere: boolean; error?: string; lang: "es" | "en" }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const set = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(50, (q[id] ?? 0) + d)) }));
  const lines = useMemo(() => Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => ({ id, qty: n })), [qty]);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * (items.find((i) => i.id === l.id)?.price ?? 0), 0);
  const groups = [...new Set(items.map((i) => i.category || ""))];
  const errText = error === "nombre" ? copy.oErrName : error === "donde" ? copy.oErrWhere : error === "vacio" ? copy.oEmpty : error ? copy.oErr : null;

  return (
    <>
      {errText && <p className="alert alert-error" role="alert">{errText}</p>}
      {groups.map((g) => (
        <section key={g || "all"} className="ob-group">
          {g && <h2 className="gx-group-name">{g}</h2>}
          <ul className="gx-items">
            {items.filter((i) => (i.category || "") === g).map((i) => {
              const n = qty[i.id] ?? 0;
              return (
                <li key={i.id} className={`gx-item ob-item${n ? " on" : ""}`}>
                  {i.image_url && <img src={i.image_url} alt="" loading="lazy" />}
                  <div className="gx-item-text">
                    <b>{i.name}</b>
                    {i.description && <p>{i.description}</p>}
                    <span className="gx-price num">{usd(i.price)}</span>
                  </div>
                  {n === 0 ? (
                    <button type="button" className="ob-add" onClick={() => set(i.id, 1)} aria-label={`${copy.oAdd} ${i.name}`}>{copy.oAdd}</button>
                  ) : (
                    <div className="ob-step" role="group" aria-label={i.name}>
                      <button type="button" onClick={() => set(i.id, -1)} aria-label="−">−</button>
                      <span className="num" aria-live="polite">{n}</span>
                      <button type="button" onClick={() => set(i.id, 1)} aria-label="+">+</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <form action={sendOrder} className="guest-form ob-form" id="enviar">
        <h2 className="gx-h">{copy.oYour}{count ? ` · ${count === 1 ? copy.oItem : copy.oItems.replace("{n}", String(count))}` : ""}</h2>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
        <label className="hp" aria-hidden="true">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
        {lines.length > 0 && (
          <ul className="ob-summary">
            {lines.map((l) => {
              const it = items.find((i) => i.id === l.id)!;
              return <li key={l.id}><span>{l.qty} × {it.name}</span><span className="num">{usd(l.qty * it.price)}</span></li>;
            })}
            <li className="ob-total"><span>{copy.oTotal}</span><span className="num">{usd(total)}</span></li>
          </ul>
        )}
        <label className="field"><span>{copy.oName}</span><input className="input" name="name" required maxLength={60} autoComplete="given-name" /></label>
        {needWhere && <label className="field"><span>{copy.oWhere}</span><input className="input" name="where" required maxLength={40} placeholder={copy.oWherePh} /></label>}
        <label className="field"><span>{copy.oPeople}</span><input className="input" name="people" type="number" inputMode="numeric" min={1} max={99} /></label>
        <label className="field"><span>{copy.oNotes}</span><textarea className="textarea" name="notes" maxLength={400} placeholder={copy.oNotesPh} style={{ minHeight: 70 }} /></label>
        <p className="muted" style={{ fontSize: 14 }}>{copy.oPay}</p>
        <Send label={count ? `${copy.oSend} · ${usd(total)}` : copy.oSend} pending={copy.oSending} disabled={!count} />
      </form>

      {count > 0 && (
        <a className="ob-bar" href="#enviar">
          <span>{count === 1 ? copy.oItem : copy.oItems.replace("{n}", String(count))}</span>
          <b className="num">{usd(total)} →</b>
        </a>
      )}
    </>
  );
}
