import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Amex, Mastercard, PayPal, Visa } from "@/components/PaymentBadges";
import { Signup } from "@/components/Signup";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Empieza con FiveTap",
  description: "Plan mensual de FiveTap: 10 placas NFC, instalación y FiveTap Business por $129 al mes. Cancelas cuando quieras.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ n?: string }> };

/** "…/subscribe?plan_id=P-XXXX" → "P-XXXX". */
const planOf = (url?: string) => (url ? /plan_id=(P-[A-Z0-9]+)/.exec(url)?.[1] ?? null : null);

// Sign-up for the monthly plan: the venue registers itself and subscribes on PayPal.
// The founder gets an alert and a task to create the business and install.
export default async function Start({ searchParams }: Props) {
  const { n } = await searchParams;
  const business = n?.slice(0, 80);
  const url = process.env.PAYPAL_MONTHLY_URL;
  const fallback = url || salesWhatsAppUrl(`Hola, quiero empezar con FiveTap${business ? ` para ${business}` : ""}.`);

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Empieza con FiveTap</h1>
        <p className="muted">{business ? `${business} · ` : ""}Todo incluido por <b>$129 al mes</b>, sin costo de instalación.</p>
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Cómo funciona</h3>
        <ol className="trial-steps">
          <li><b>Hoy</b> Te registras y activas tu plan. Te escribimos para elegir el día de la instalación.</li>
          <li><b>Día de la instalación</b> Dejamos tus 10 placas NFC y FiveTap Business en tu celular. Anotamos tus reseñas actuales en Google.</li>
          <li><b>Desde ese día</b> Ves en tu app cuántos clientes van a dejarte su reseña, y cada mes te llega tu reporte.</li>
        </ol>
        <p className="muted">Sin permanencia: cancelas cuando quieras, desde tu app, desde PayPal o con un mensaje.</p>
      </section>

      <section className="pay-method pay-method-pick rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Plan mensual</h3>
          <span className="trial-price"><b className="num">$129</b> / mes</span>
        </div>
        <p className="muted">10 placas NFC premium, instalación y FiveTap Business incluidos. Sin permanencia: cancelas cuando quieras.</p>
        <Signup clientId={process.env.PAYPAL_CLIENT_ID} planId={planOf(url)} fallbackUrl={fallback} presetVenue={business} />
      </section>

      <section className="pay-method rise" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Plan anual</h3>
          <span className="trial-price"><b className="num">$1,290</b> / año</span>
        </div>
        <p className="muted">Incluye placas personalizadas con la marca de tu local. Dinos cuántas quieres y te enviamos tu propuesta.</p>
        <a className="btn btn-ghost" href={salesWhatsAppUrl(`Hola, quiero cotizar el plan anual de FiveTap${business ? ` para ${business}` : ""}. Tengo ___ mesas.`)}>Cotizar plan anual</a>
      </section>

      <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
        <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        <p className="muted pay-foot">Pago seguro con PayPal. Puedes usar tu tarjeta Visa, Mastercard o American Express.</p>
      </div>
    </main>
  );
}
