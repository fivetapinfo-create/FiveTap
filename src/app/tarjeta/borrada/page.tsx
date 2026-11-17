import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tarjeta borrada", robots: { index: false, follow: false } };

export default function Deleted() {
  return (
    <main className="lc-page">
      <section className="lc" style={{ "--lc-bg": "#141414", "--lc-ink": "#f6f5f1" } as React.CSSProperties}>
        <div className="lc-status"><b>Tu tarjeta fue borrada</b><span>Borramos tu nombre, tu WhatsApp y tus sellos. Si quitaste el ícono de tu pantalla de inicio, ya no queda nada.</span></div>
      </section>
    </main>
  );
}
