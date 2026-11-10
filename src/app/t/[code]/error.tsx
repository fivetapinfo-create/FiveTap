"use client";

import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";

/** If the plaque page can't load (bad signal, a hiccup), the guest can retry in one tap. */
export default function GuestError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="guest">
      <div className="guest-wrap" style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 12 }}>
        <LogoMark size={36} />
        <h1 className="guest-title">Un momento…</h1>
        <p className="guest-lead">No pudimos cargar la página. Revisa tu señal e inténtalo de nuevo.</p>
        <button type="button" className="btn btn-dark" onClick={reset}>Intentar de nuevo</button>
      </div>
    </main>
  );
}
