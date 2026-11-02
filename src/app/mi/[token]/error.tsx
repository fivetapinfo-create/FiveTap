"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Logo";

export default function OwnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container"><Logo size={20} /></div>
      </header>
      <main className="container admin-main">
        <section className="panel empty">
          <p>No se pudo cargar tu resumen. Revisa tu conexión e inténtalo otra vez.</p>
          <button type="button" className="btn btn-dark btn-sm" onClick={reset}>Reintentar</button>
        </section>
      </main>
    </div>
  );
}
