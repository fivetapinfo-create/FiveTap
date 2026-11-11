import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Amex, Mastercard, PayPal, Visa } from "@/components/PaymentBadges";
import { Signup } from "@/components/Signup";
import { TIERS, WAITER_TIERS, annualPrice, planByKey } from "@/lib/plans";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Empieza con FiveTap",
  description: "Elige tu plan de FiveTap: placas NFC instaladas o tarjetas para meseros, con FiveTap Business. Pago mensual con tarjeta o PayPal. Cancelas cuando quieras.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ n?: string; plan?: string }> };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// Sign-up for any monthly plan: the venue picks it, registers and subscribes on PayPal
// (charged by itself every month). The founder gets an alert and a task to install.
export default async function Start({ searchParams }: Props) {
  const { n, plan: key } = await searchParams;
  const business = n?.slice(0, 80);
  const plan = planByKey(key) ?? planByKey("esencial")!;
  const href = (k: string) => `/empezar?plan=${k}${business ? `&n=${encodeURIComponent(business)}` : ""}`;
  const ask = salesWhatsAppUrl(`Hola, quiero el plan ${plan.title} de FiveTap ($${plan.monthly} al mes)${business ? ` para ${business}` : ""}.`);
  const installs = plan.line === "placas" ? `tus ${plan.qty === 1 ? "placa" : `${plan.qty} placas`} NFC` : `tus ${plan.name} para meseros`;

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Empieza con FiveTap</h1>
        <p className="muted">{business ? `${business} · ` : ""}Elige tu plan. Se paga cada mes con tarjeta o PayPal, sin costo de instalación.</p>
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Placas para mesas y mostrador</h3>
        <div className="plan-pick">
          {TIERS.map((t) => (
            <Link key={t.key} href={href(t.key)} className={`plan-chip${t.key === plan.key ? " on" : ""}`} aria-current={t.key === plan.key ? "true" : undefined}>
              <b>{t.name}</b>
              <span>{t.qty === 1 ? "1 placa" : `hasta ${t.qty}`} · {usd(t.monthly)}/mes</span>
            </Link>
          ))}
        </div>
        <h3 style={{ marginTop: 8 }}>Tarjetas para meseros</h3>
        <div className="plan-pick">
          {WAITER_TIERS.map((t) => (
            <Link key={t.key} href={href(t.key)} className={`plan-chip${t.key === plan.key ? " on" : ""}`} aria-current={t.key === plan.key ? "true" : undefined}>
              <b>{t.name}</b>
              <span>{usd(t.monthly)}/mes</span>
            </Link>
          ))}
        </div>
        <p className="muted">¿Quieres placas y tarjetas? Suscríbete a un plan y escríbenos para sumar el otro.</p>
      </section>

      <section className="pay-method pay-method-pick rise" id="pagar" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>{plan.title}</h3>
          <span className="trial-price"><b className="num">{usd(plan.monthly)}</b> / mes</span>
        </div>
        <p className="muted">{plan.detail}. Instalación incluida. Sin permanencia: cancelas cuando quieras. Anual: {usd(annualPrice(plan))} (2 meses gratis).</p>
        {plan.paypalPlan ? (
          <Signup key={plan.key} clientId={process.env.PAYPAL_CLIENT_ID} planId={plan.paypalPlan} fallbackUrl={`https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${plan.paypalPlan}`} presetVenue={business} plan={plan} />
        ) : (
          <>
            <p className="muted">Este plan todavía no se puede pagar en línea. Escríbenos y te lo activamos hoy por Yappy o transferencia.</p>
            <a className="btn btn-dark" href={ask}>Pedir este plan por WhatsApp</a>
          </>
        )}
      </section>

      <section className="pay-method rise" style={{ "--i": 3 } as React.CSSProperties}>
        <h3>Cómo funciona</h3>
        <ol className="trial-steps">
          <li><b>Hoy</b> Te registras y activas tu plan. Te escribimos para elegir el día de la instalación.</li>
          <li><b>Día de la instalación</b> Dejamos {installs} y FiveTap Business en tu celular. Anotamos tus reseñas actuales en Google.</li>
          <li><b>Desde ese día</b> Ves en tu app cuántos clientes van a dejarte su reseña, y cada mes te llega tu reporte.</li>
        </ol>
      </section>

      <section className="pay-method rise" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Plan anual</h3>
          <span className="trial-price"><b className="num">{usd(annualPrice(plan))}</b> / año</span>
        </div>
        <p className="muted">Pagas 10 meses y usas 12. En un solo pago, o la mitad en línea y la mitad en efectivo el día de la instalación.</p>
        <a className="btn btn-ghost" href={salesWhatsAppUrl(`Hola, quiero el plan anual ${plan.title} de FiveTap${business ? ` para ${business}` : ""}.`)}>Pedir plan anual</a>
      </section>

      <div className="rise" style={{ "--i": 5 } as React.CSSProperties}>
        <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        <p className="muted pay-foot">Pago seguro con PayPal. Puedes usar tu tarjeta Visa, Mastercard o American Express.</p>
      </div>
    </main>
  );
}
