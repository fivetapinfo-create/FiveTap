"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CopyButton, copyText } from "./CopyButton";
import { island } from "./Island";

/**
 * One link, three actions: Copy, Share, Open. "Share" opens an iOS-style action sheet:
 * WhatsApp with an editable message (to a number or to any chat), the phone's own share
 * sheet when it has one, copy and open. Real channels only: wa.me and navigator.share.
 * The sheet follows the finger when dragged down and closes if flicked or pulled far enough.
 */
export function LinkActions({ url, title, message, compact }: { url: string; title: string; message: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`la${compact ? " la-compact" : ""}`}>
        <CopyButton value={url} label="Copiar" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Compartir</button>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">Abrir</a>
      </div>
      {open && <ShareSheet url={url} title={title} message={message} onClose={() => setOpen(false)} />}
    </>
  );
}

const digits = (s: string) => {
  const d = s.replace(/\D/g, "");
  if (!d) return "";
  return d.length === 8 ? `507${d}` : d; // Panama numbers typed without the country code
};

function ShareSheet({ url, title, message, onClose }: { url: string; title: string; message: string; onClose: () => void }) {
  const [text, setText] = useState(message);
  const [phone, setPhone] = useState("");
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; last: number; t: number; v: number } | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, 260);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", k);
    document.documentElement.classList.add("sheet-open");
    return () => { document.removeEventListener("keydown", k); document.documentElement.classList.remove("sheet-open"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag the grabber down: 1:1 tracking, then commit by velocity (a flick) or distance.
  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, last: e.clientY, t: performance.now(), v: 0 };
    if (sheet.current) sheet.current.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !sheet.current) return;
    const now = performance.now();
    d.v = ((e.clientY - d.last) / Math.max(1, now - d.t)) * 1000; d.last = e.clientY; d.t = now;
    const dy = e.clientY - d.y0;
    // Pulling up resists (rubber band); pulling down follows the finger.
    const y = dy >= 0 ? dy : -((-dy * 60) / (60 + -dy * 0.55));
    sheet.current.style.transform = `translateY(${y}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; if (!d || !sheet.current) return;
    const dy = e.clientY - d.y0;
    const projected = dy + (d.v / 1000) * 0.998 / (1 - 0.998); // where the flick was heading
    sheet.current.style.transition = "";
    if (projected > 160 || d.v > 900) { sheet.current.style.transform = ""; close(); }
    else sheet.current.style.transform = "";
  };

  const wa = `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;
  return createPortal(
    <div className={`sheet-layer${closing ? " closing" : ""}`} onClick={close}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-label={`Compartir ${title}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span /></div>
        <div className="sheet-head">
          <b>Compartir · {title}</b>
          <span className="code sheet-url">{url}</span>
        </div>
        <label className="field">
          <span>Mensaje (puedes cambiarlo)</span>
          <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="field">
          <span>WhatsApp de la persona (opcional)</span>
          <input className="input" inputMode="tel" placeholder="6000-0000 · vacío para elegir el chat en WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div className="sheet-actions">
          <a className="btn btn-wa btn-block" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => { island("Abriendo WhatsApp", "share"); close(); }}>Enviar por WhatsApp</a>
          {canShare && (
            <button type="button" className="btn btn-ghost btn-block" onClick={async () => {
              try { await navigator.share({ title, text, url }); island("Compartido", "share"); close(); } catch { /* the person closed the share sheet */ }
            }}>Compartir con otra app…</button>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={async () => { if (await copyText(text)) { island("Mensaje copiado"); close(); } else island("No se pudo copiar.", "error"); }}>Copiar mensaje con el enlace</button>
          <button type="button" className="btn btn-ghost btn-block sheet-cancel" onClick={close}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
