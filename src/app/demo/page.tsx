import type { Metadata } from "next";
import { GuestCard } from "@/components/GuestCard";
import { Check } from "@/components/Icons";
import { COPY } from "@/lib/i18n";
import { safeColor } from "@/lib/brand";

export const metadata: Metadata = { title: "Demo — FiveTap", robots: { index: false } };

// Sales tool: type the owner's business name in the URL and hand them the phone.
// /demo?n=Café%20Unido&c=%23c2410c
type Props = { searchParams: Promise<{ n?: string; c?: string; enviado?: string }> };

export default async function Demo({ searchParams }: Props) {
  const sp = await searchParams;
  const name = (sp.n || "Tu negocio").slice(0, 60);
  const color = safeColor(sp.c, "#0b0b0f");
  const self = `/demo?n=${encodeURIComponent(name)}&c=${encodeURIComponent(color)}`;

  if (sp.enviado) {
    return (
      <main className="guest">
        <div className="guest-wrap" style={{ textAlign: "center" }}>
          <div className="check-badge"><Check /></div>
          <h1 className="guest-title" style={{ marginTop: 0 }}>{COPY.es.thanksTitle}</h1>
          <p className="guest-lead">
            En la versión real, este mensaje le llega al gerente de {name} al instante, en privado.
          </p>
          <div className="guest-actions">
            <a className="btn btn-ghost btn-block" href={self}>Volver a la demo</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <GuestCard
      business={{ name, logo_url: null, brand_color: color }}
      copy={COPY.es}
      // In the demo, "review" opens the business on Google Maps so the owner sees their own listing.
      reviewHref={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " Panamá")}`}
      managerHref={`${self}&enviado=1`}
      clubHref={self}
    />
  );
}
