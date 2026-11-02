"use client";

import { useEffect } from "react";

/** If a section fails to load (bad connection, a hiccup), offer to retry instead of a blank page. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="container admin-main">
      <section className="panel empty">
        <p>No se pudo cargar esta sección. Revisa tu conexión e inténtalo otra vez.</p>
        <button type="button" className="btn btn-dark btn-sm" onClick={reset}>Reintentar</button>
      </section>
    </main>
  );
}
