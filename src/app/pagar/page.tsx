import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { AcceptedPayments, Amex, Bank, Mastercard, PayPal, Visa, Yappy } from "@/components/PaymentBadges";
import { PayOnline } from "@/components/PayOnline";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Pagar — FiveTap", robots: { index: false } };
export const dynamic = "force-dynamic";

// Every method is configuration (env vars, see .env.example). Card payments go
// through PayPal links: Visa, Mastercard and Amex work without a PayPal account.
type Props = { searchParams: Promise<{ n?: string }> };

const PLANS = [
  { name: "Plan mensual", note: "Cada mes · 10 placas, instalación y FiveTap Business incluidos", price: "$129" },
  { name: "Plan anual", note: "Un pago, o la mitad en línea ($645) y la mitad en efectivo el día de la instalación", price: "$1,290" },
  { name: "1 placa", note: "Cada mes · con FiveTap Business", price: "$35" },
  { name: "2 placas", note: "Pago único, directo a Google", price: "$60" },
  { name: "3 placas", note: "Pago único, directo a Google", price: "$85" },
  { name: "4 placas", note: "Pago único · $25 c/u", price: "$100" },
  { name: "6 placas", note: "Pago único · $22 c/u", price: "$132" },
  { name: "Tarjetas para meseros", note: "1 por $25 · 4 por $90 · 6 por $120 · 10 por $180", price: "desde $25" },
];

export default async function Pay({ searchParams }: Props) {
  const { n } = await searchParams;
  const business = n?.slice(0, 80);
  const env = process.env;
  const forWho = business ? ` para ${business}` : "";
  const proof = salesWhatsAppUrl(`Hola, ya pagué FiveTap${forWho}. Te envío el comprobante.`);
  const askCardLink = salesWhatsAppUrl(`Hola, quiero pagar FiveTap${forWho} con tarjeta. ¿Me envías el enlace?`);
  const cardLinks = [
    { url: env.PAYPAL_MONTHLY_URL, label: "Plan mensual · $129 al mes", dark: true },
    { url: env.PAYPAL_ANNUAL_URL, label: "Plan anual · $1,290", dark: false },
    { url: env.PAYPAL_ANNUAL_HALF_URL, label: "Mitad del plan anual · $645", dark: false },
    { url: env.PAYPAL_PLAQUE_URL, label: "1 placa · $35 al mes", dark: false },
    { url: env.PAYPAL_PACK_URL, label: "2 placas · $60 pago único", dark: false },
    { url: env.PAYPAL_WAITER_URL, label: "Tarjeta para meseros · $25", dark: false },
    { url: env.CARD_PAYMENT_URL, label: "Pagar con tarjeta", dark: false },
  ].filter((l) => l.url);
  const recurring = env.PAYPAL_MONTHLY_URL || env.PAYPAL_PLAQUE_URL;
  const yappy = env.YAPPY_HANDLE;
  const bank = env.BANK_NAME && env.BANK_ACCOUNT_NUMBER;

  return (
    <main className="pay">
      <Link href="/" aria-label="FiveTap"><Logo /></Link>

      <header className="rise">
        <h1 className="pay-title">Pagar FiveTap</h1>
        <p className="muted">{business ? `${business} · ` : ""}Pago seguro. Elige el método que prefieras.</p>
        <AcceptedPayments />
      </header>

      <section className="pay-method rise" style={{ "--i": 1 } as React.CSSProperties}>
        <h3>Montos</h3>
        <ul className="pay-plans">
          {PLANS.map((p) => (
            <li key={p.name}>
              <span><b>{p.name}</b><small>{p.note}</small></span>
              <span className="num">{p.price}</span>
            </li>
          ))}
        </ul>
      </section>

      {env.PAYPAL_CLIENT_ID && (
        <section className="pay-method pay-method-pick rise" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="pay-method-head">
            <h3>Pagar en línea</h3>
            <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
          </div>
          <p className="muted">Plan anual, placas o tarjetas, en un solo pago. Para el plan mensual, entra a <Link href="/empezar" style={{ textDecoration: "underline" }}>Empezar</Link>.</p>
          <PayOnline clientId={env.PAYPAL_CLIENT_ID} presetVenue={business} />
        </section>
      )}

      <section className="pay-method rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Tarjeta o PayPal</h3>
          <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        </div>
        <p className="muted">
          Visa, Mastercard, American Express o PayPal.
          {recurring && " Las mensualidades se cobran solas cada mes. Cancelas cuando quieras."}
        </p>
        {cardLinks.length > 0 ? (
          <div className="pay-buttons">
            {cardLinks.map((l) => (
              <a key={l.label} className={`btn ${l.dark ? "btn-dark" : "btn-ghost"}`} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        ) : (
          <a className="btn btn-dark" href={askCardLink}>Pedir enlace de pago con tarjeta</a>
        )}
      </section>

      {yappy && (
        <section className="pay-method rise" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="pay-method-head">
            <h3>Yappy</h3>
            <span className="pm-row pm-row-sm"><Yappy /></span>
          </div>
          <div className="pay-copy">
            <span className="pay-big num">{yappy}</span>
            <CopyButton value={yappy.replace(/[^\d]/g, "").replace(/^507/, "")} />
          </div>
          <p className="muted">En el mensaje escribe el nombre de tu negocio.</p>
        </section>
      )}

      {bank && (
        <section className="pay-method rise" style={{ "--i": 4 } as React.CSSProperties}>
          <div className="pay-method-head">
            <h3>Transferencia / ACH</h3>
            <span className="pm-row pm-row-sm"><Bank /></span>
          </div>
          <dl className="kv">
            <dt>Banco</dt><dd>{env.BANK_NAME}</dd>
            {env.BANK_ACCOUNT_NAME && (<><dt>Titular</dt><dd>{env.BANK_ACCOUNT_NAME}</dd></>)}
            {env.BANK_ACCOUNT_TYPE && (<><dt>Tipo</dt><dd>{env.BANK_ACCOUNT_TYPE}</dd></>)}
            <dt>Cuenta</dt><dd className="num">{env.BANK_ACCOUNT_NUMBER}</dd>
          </dl>
          <div><CopyButton value={env.BANK_ACCOUNT_NUMBER!} label="Copiar número de cuenta" /></div>
        </section>
      )}

      <a className="btn btn-dark btn-block rise" style={{ "--i": 5 } as React.CSSProperties} href={proof}>
        Enviar comprobante por WhatsApp
      </a>
      <p className="muted pay-foot">Tu servicio se activa en cuanto confirmamos el pago.</p>
    </main>
  );
}
