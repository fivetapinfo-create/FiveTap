import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Amex, Mastercard, PayPal, Visa } from "@/components/PaymentBadges";
import { TrialSignup } from "@/components/TrialSignup";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Prueba gratis 7 días — FiveTap",
  description: "Prueba el plan mensual de FiveTap 7 días gratis con una placa NFC de prueba. Hoy no pagas nada y cancelas cuando quieras.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ n?: string }> };

/** "…/subscribe?plan_id=P-XXXX" → "P-XXXX". */
const planOf = (url?: string) => (url ? /plan_id=(P-[A-Z0-9]+)/.exec(url)?.[1] ?? null : null);

// Free trial of the monthly plan: the venue registers itself and its card on a PayPal
// plan with 7 free days. Nothing is charged today; PayPal charges $129 on day 8.
export default async function Trial({ searchParams }: Props) {
  const { n } = await searchParams;
  const business = n?.slice(0, 80);
  const url = process.env.PAYPAL_MONTHLY_TRIAL_URL;
  const fallback = url || salesWhatsAppUrl(`Hola, quiero empezar la prueba gratis de FiveTap${business ? ` para ${business}` : ""}.`);

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Prueba gratis 7 días</h1>
        <p className="muted">{business ? `${business} · ` : ""}Plan mensual con una <b>placa NFC de prueba</b>. Hoy no pagas nada.</p>
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Cómo funciona</h3>
        <ol className="trial-steps">
          <li><b>Hoy</b> Te registras, registras tu tarjeta y te llevamos tu placa NFC de prueba. <b>Cobro de hoy: $0.</b></li>
          <li><b>Día 7</b> En tu app ves cuántos clientes fueron a dejarte su reseña.</li>
          <li><b>Día 8</b> Se cobran tus $129 y te instalamos el resto de tus placas y <b>FiveTap Business</b>, sin costo de instalación.</li>
        </ol>
        <p className="muted">¿No te convenció? Cancelas antes del día 8 desde PayPal o con un mensaje, y no se te cobra nada.</p>
      </section>

      <section className="pay-method pay-method-pick rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Plan mensual</h3>
          <span className="trial-price"><b className="num">$129</b> / mes</span>
        </div>
        <p className="trial-includes">7 días gratis · incluye placa NFC de prueba</p>
        <p className="muted">10 placas NFC premium, instalación y FiveTap Business incluidos. Cancelas cuando quieras.</p>
        <TrialSignup clientId={process.env.PAYPAL_CLIENT_ID} planId={planOf(url)} fallbackUrl={fallback} presetVenue={business} />
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
