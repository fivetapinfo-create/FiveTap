"use client";

import { useState } from "react";
import { island } from "./Island";

/** Copies to the clipboard; the label turns into a check that pops, and the island confirms. */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older browsers or a blocked clipboard: select a hidden field and copy it.
    try {
      const t = document.createElement("textarea");
      t.value = value; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      const ok = document.execCommand("copy");
      t.remove();
      return ok;
    } catch { return false; }
  }
}

export function CopyButton({ value, label = "Copiar", done: doneText = "Enlace copiado", className = "btn btn-ghost btn-sm" }: { value: string; label?: string; done?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${className} copy-btn${done ? " is-done" : ""}`}
      onClick={async () => {
        const ok = await copyText(value);
        if (!ok) { island("No se pudo copiar. Mantén presionado el enlace para copiarlo.", "error"); return; }
        island(doneText);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <><svg className="copy-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> Copiado</> : label}
    </button>
  );
}
