"use client";

import { useEffect, useRef, useState } from "react";

/** A box to draw a signature with the finger or the mouse; the drawing goes into a hidden input as PNG. */
export function SignaturePad({ name = "signature" }: { name?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const out = useRef<HTMLInputElement>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0a0a0a";
    let drawing = false, last: [number, number] | null = null;
    const at = (e: PointerEvent): [number, number] => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const down = (e: PointerEvent) => { drawing = true; last = at(e); c.setPointerCapture(e.pointerId); e.preventDefault(); };
    const move = (e: PointerEvent) => {
      if (!drawing || !last) return;
      const p = at(e);
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      last = p; setEmpty(false); e.preventDefault();
    };
    const up = () => { if (!drawing) return; drawing = false; last = null; if (out.current) out.current.value = c.toDataURL("image/png"); };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
  }, []);

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    if (out.current) out.current.value = "";
    setEmpty(true);
  };

  return (
    <div className="sig-pad">
      <canvas ref={canvas} aria-label="Recuadro para dibujar tu firma" />
      {empty && <span className="sig-hint" aria-hidden="true">Firma aquí con tu dedo</span>}
      <input ref={out} type="hidden" name={name} />
      <button type="button" className="btn btn-ghost btn-sm sig-clear" onClick={clear}>Borrar firma</button>
    </div>
  );
}
