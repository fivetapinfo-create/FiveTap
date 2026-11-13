import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Amex, Mastercard, PayPal, Visa } from "@/components/PaymentBadges";
import { Signup } from "@/components/Signup";
import { activePlans, planPieces } from "@/lib/plans";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Empieza con FiveTap",
  description: "Elige FiveTap Start, Pro o Enterprise: placas FiveTap, tarjetas de equipo y FiveTap Business, con instalación incluida. Pago mensual con tarjeta o PayPal.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ n?: string; plan?: string }> };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// Sign-up: the venue picks Start, Pro or Enterprise, registers and subscribes on PayPal
// (charged by itself every month). The founder gets an alert and a task to install.
export default async function Start({ searchParams }: Props) {
  const [{ n, plan: key }, plans] = await Promise.all([searchParams, activePlans()]);
  const business = n?.slice(0, 80);
  const plan = plans.find((p) => p.key === key) ?? plans[0];
  const href = (k: string) => `/empezar?plan=${k}${business ? `&n=${encodeURIComponent(business)}` : ""}#pagar`;
  if (!plan) return <main className="pay"><p>No hay planes disponibles por ahora. <a href={salesWhatsAppUrl("Hola, quiero FiveTap.")}>Escríbenos</a>.</p></main>;
  const pieces = planPieces(plan);
  const ask = salesWhatsAppUrl(`Hola, quiero el plan ${plan.name} ($${plan.monthly} al mes)${business ? ` para ${business}` : ""}.`);

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Empieza con FiveTap</h1>
        <p className="muted">{business ? `${business} · ` : ""}Elige tu plan. Se paga cada mes con tarjeta o PayPal.</p>
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Tu plan</h3>
        <div className="plan-pick">
          {plans.map((p) => (
            <Link key={p.key} href={href(p.key)} className={`plan-chip${p.key === plan.key ? " on" : ""}`} aria-current={p.key === plan.key ? "true" : undefined}>
              <b>{p.name.replace(/^FiveTap\s+/, "")}{p.badge ? ` · ${p.badge}` : ""}</b>
              <span>{p.plaques} placas + {p.cards} tarjetas · {usd(p.monthly)}/mes</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pay-method pay-method-pick rise" id="pagar" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>{plan.name}</h3>
          <span className="trial-price"><b className="num">{usd(plan.monthly)}</b> / mes</span>
        </div>
        <ul className="ticks">
          {[...pieces, ...plan.features].map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="muted">Empiezas con un contrato de 3 meses para comprobar los resultados. Precio de lanzamiento.</p>
        {plan.paypal_plan ? (
          <Signup
            key={plan.key}
            clientId={process.env.PAYPAL_CLIENT_ID}
            planId={plan.paypal_plan}
            fallbackUrl={`https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${plan.paypal_plan}`}
            presetVenue={business}
            plan={{ key: plan.key, title: plan.name, detail: pieces.join(" · "), monthly: plan.monthly }}
          />
        ) : (
          <>
            <p className="muted">Este plan se activa con nosotros por WhatsApp y se paga por Yappy, transferencia o tarjeta.</p>
            <a className="btn btn-dark" href={ask}>Pedir {plan.name} por WhatsApp</a>
          </>
        )}
      </section>

      <section className="pay-method rise" style={{ "--i": 3 } as React.CSSProperties}>
        <h3>Cómo funciona</h3>
        <ol className="trial-steps">
          <li><b>Hoy</b> Te registras y activas tu plan. Te escribimos para elegir el día de la instalación.</li>
          <li><b>Día de la instalación</b> Instalamos tus {plan.plaques} placas FiveTap, las {plan.cards} tarjetas de tu equipo y FiveTap Business en tu celular, y anotamos tus reseñas actuales en Google.</li>
          <li><b>Desde ese día</b> Ves en tu app cuántos clientes van a dejarte su reseña, y cada mes te llega tu reporte.</li>
        </ol>
      </section>

      <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
        <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        <p className="muted pay-foot">Pago seguro con PayPal. Puedes usar tu tarjeta Visa, Mastercard o American Express.</p>
      </div>
    </main>
  );
}
