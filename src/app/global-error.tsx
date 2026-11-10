"use client";

/** Last resort if the root layout itself fails: plain HTML, no dependencies. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f5f1", color: "#0a0a0a" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>FiveTap</h1>
          <p>Algo no cargó bien. Inténtalo de nuevo en unos segundos.</p>
          <button type="button" onClick={reset} style={{ padding: "12px 20px", borderRadius: 999, border: 0, background: "#0a0a0a", color: "#fff", fontSize: 15 }}>
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
