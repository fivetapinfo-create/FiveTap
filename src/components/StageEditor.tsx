"use client";

import { useRef, useState } from "react";

/** The founder picks a photo of the venue; it turns low-poly here (preview) and is saved as the waiter's stage. */
export function StageEditor({ current }: { current: string | null }) {
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const out = useRef<HTMLInputElement>(null);
  return (
    <div className="stage-ed">
      <div className="stage-prev">{preview ? <img src={preview} alt="Escenario del mesero" /> : <span>Sin escenario</span>}</div>
      <label className="field"><span>Foto del local (de frente, horizontal)</span>
        <input type="file" accept="image/*" className="input" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const { lowPoly } = await import("@/lib/lowpoly");
            const blob = await lowPoly(f);
            const file = new File([blob], "escenario.jpg", { type: "image/jpeg" });
            const dt = new DataTransfer(); dt.items.add(file);
            if (out.current) out.current.files = dt.files;
            setPreview(URL.createObjectURL(blob));
          } finally { setBusy(false); }
        }} />
      </label>
      <input ref={out} type="file" name="stage" hidden accept="image/jpeg" />
      {busy && <small className="muted">Convirtiendo a low-poly…</small>}
    </div>
  );
}
