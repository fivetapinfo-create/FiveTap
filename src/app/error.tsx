"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";

/** Any other public page that fails: a calm message with retry instead of a blank screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="guest">
      <div className="guest-wrap" style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 12 }}>
        <LogoMark size={36} />
        <h1 className="guest-title">Algo no cargó bien</h1>
        <p className="guest-lead">Inténtalo de nuevo en unos segundos.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-dark" onClick={reset}>Intentar de nuevo</button>
          <Link className="btn btn-ghost" href="/">Ir al inicio</Link>
        </div>
      </div>
    </main>
  );
}
