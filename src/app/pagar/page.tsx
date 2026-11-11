import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { AcceptedPayments, Amex, Bank, Mastercard, PayPal, Visa, Yappy } from "@/components/PaymentBadges";
import { activePlans, planPieces } from "@/lib/plans";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Pagar — FiveTap", robots: { index: false } };
export const dynamic = "force-dynamic";

// Every method is configuration (env vars, see .env.example). Card payments go
// through PayPal links: Visa, Mastercard and Amex work without a PayPal account.
type Props = { searchParams: Promise<{ n?: string }> };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
export default async function Pay({ searchParams }: Props) {
  const [{ n }, plans] = await Promise.all([searchParams, activePlans()]);
  const PLANS = [
    ...plans.map((p) => ({ name: p.name, note: `Cada mes · ${planPieces(p).join(" · ")} · FiveTap Business`, price: `${usd(p.monthly)}/mes` })),
    { name: "Piezas adicionales o necesidades especiales", note: "Te enviamos tu propuesta", price: "Cotizar" },
  ];
  const business = n?.slice(0, 80);
  const env = process.env;
  const forWho = business ? ` para ${business}` : "";
  const proof = salesWhatsAppUrl(`Hola, ya pagué FiveTap${forWho}. Te envío el comprobante.`);
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

      <section className="pay-method rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="pay-method-head">
          <h3>Suscribirte con tarjeta o PayPal</h3>
          <span className="pm-row pm-row-sm"><Visa /><Mastercard /><Amex /><PayPal /></span>
        </div>
        <p className="muted">Elige Start, Pro o Enterprise y se cobra solo cada mes con tu tarjeta Visa, Mastercard, American Express o PayPal.</p>
        <a className="btn btn-dark" href={`/empezar${business ? `?n=${encodeURIComponent(business)}` : ""}`}>Elegir mi plan</a>
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
