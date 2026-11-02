import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Amex, Mastercard, PayPal, Visa } from "@/components/PaymentBadges";
import { PayPalSubscribe } from "@/components/PayPalSubscribe";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Prueba gratis 7 días — FiveTap",
  description: "Pruébalo 7 días gratis con una placa NFC de prueba. Hoy no pagas nada y cancelas cuando quieras.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ plan?: string; n?: string }> };

// Free trial: the guest registers a card on a PayPal plan with 7 free days.
// Nothing is charged today; PayPal charges on day 8 unless they cancel first.
const OPTIONS = {
  mensual: {
    name: "Plan mensual",
    price: "$99",
    unit: "/ mes",
    after: "Desde el día 8: $99 al mes. La instalación de tus placas y de FiveTap Business, la app para dueños, gerentes y encargados ($150), se paga ese día, en persona.",
    env: "PAYPAL_TRIAL_MONTHLY_URL",
  },
  anual: {
    name: "Plan anual",
    price: "$948",
    unit: "/ año",
    after: "Desde el día 8: $948 por 12 meses (equivale a $79 al mes). Instalación de placas y FiveTap Business gratis.",
    env: "PAYPAL_TRIAL_ANNUAL_URL",
  },
} as const;

/** "…/subscribe?plan_id=P-XXXX" → "P-XXXX". */
const planOf = (url: string) => /plan_id=(P-[A-Z0-9]+)/.exec(url)?.[1] ?? null;

export default async function Trial({ searchParams }: Props) {
  const { plan, n } = await searchParams;
  const business = n?.slice(0, 80);
  const forWho = business ? ` para ${business}` : "";
  const clientId = process.env.PAYPAL_CLIENT_ID;

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Prueba gratis 7 días</h1>
        <p className="muted">{business ? `${business} · ` : ""}Incluye una <b>placa NFC de prueba</b>. Hoy no pagas nada.</p>
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Cómo funciona</h3>
        <ol className="trial-steps">
          <li><b>Hoy</b> Registras tu tarjeta en PayPal y te dejamos tu placa NFC de prueba. <b>Cobro de hoy: $0.</b></li>
          <li><b>Día 7</b> Vemos juntos cuántos clientes fueron a dejarte su reseña.</li>
          <li><b>Día 8</b> Se cobra tu plan solo e instalamos <b>FiveTap Business</b> (la app para dueños, gerentes y encargados) y el resto de tus placas, <b>personalizadas con tu logo</b>.</li>
        </ol>
        <p className="muted">¿No te convenció? Cancelas cuando quieras desde tu cuenta de PayPal o con un mensaje, y no se te cobra nada.</p>
      </section>

      {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[])
        .sort((a) => (a === plan ? -1 : 0))
        .map((key, i) => {
          const o = OPTIONS[key];
          const url = process.env[o.env];
          const fallback = salesWhatsAppUrl(`Hola, quiero empezar la prueba gratis de FiveTap (${o.name.toLowerCase()})${forWho}.`);
          return (
            <section key={key} className={`pay-method rise${key === plan ? " pay-method-pick" : ""}`} style={{ "--i": i + 2 } as React.CSSProperties}>
              <div className="pay-method-head">
                <h3>{o.name}</h3>
                <span className="trial-price"><b className="num">{o.price}</b> {o.unit}</span>
              </div>
              <p className="trial-includes">7 días gratis · incluye placa NFC de prueba</p>
              <p className="muted">{o.after}</p>
              {url && clientId && planOf(url) ? (
                <PayPalSubscribe clientId={clientId} planId={planOf(url)!} plan={key} business={business} fallbackUrl={url} />
              ) : (
                <a className={`btn ${key === plan || (!plan && key === "mensual") ? "btn-dark" : "btn-ghost"}`} href={url || fallback} target={url ? "_blank" : undefined} rel="noreferrer">
                  {url ? "Empezar prueba gratis · registrar tarjeta" : "Empezar prueba gratis"}
                </a>
              )}
            </section>
          );
        })}

      <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
        <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        <p className="muted pay-foot">Pago seguro con PayPal. Puedes usar tu tarjeta Visa, Mastercard o American Express.</p>
      </div>
    </main>
  );
}
