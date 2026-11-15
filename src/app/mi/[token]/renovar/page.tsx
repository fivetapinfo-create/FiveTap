import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { CopyButton } from "@/components/CopyButton";
import { Logo } from "@/components/Logo";
import { accessRole } from "@/lib/access";
import { billingState, human, planLabel, renewalWhat } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { getPlans } from "@/lib/plans";
import { FOUNDER_PHONE, founderWhatsApp } from "@/lib/test-kit";

export const dynamic = "force-dynamic";

type Method = "efectivo" | "yappy" | "transferencia";
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Renovar · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;

/**
 * Renewing the plan from FiveTap Business: when it is due, how much, and how to pay
 * (cash, Yappy or bank transfer). The owner sends the receipt to the founder by WhatsApp;
 * the founder registers the payment and the receipt goes out as always.
 */
export default async function RenewPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  // Payments are the owner's: the manager goes back to the summary.
  if (role !== "owner") redirect(home);
  const [d, plans] = await Promise.all([businessDetail(b.id), getPlans()]);
  const billing = billingState(b, d?.payments ?? []);
  const charge = billing.charge;
  const plaques = (d?.tags ?? []).filter((t) => t.active).length;
  const plan = planLabel(b, charge, plaques, plans);
  const env = process.env;
  const yappy = env.YAPPY_HANDLE || null;
  const bank = env.BANK_NAME && env.BANK_ACCOUNT_NUMBER ? env.BANK_ACCOUNT_NUMBER : null;
  const methods: { key: Method; label: string; on: boolean }[] = [
    { key: "efectivo", label: "Efectivo", on: true },
    { key: "yappy", label: "Yappy", on: Boolean(yappy) },
    { key: "transferencia", label: "Transferencia", on: Boolean(bank) },
  ];
  const m = methods.find((x) => x.key === sp.m && x.on)?.key ?? null;
  const amount = charge ? money(charge.amount) : "";
  const what = renewalWhat(plaques).replace(/^t/, "T");
  const pl = plaques > 0; // "tu placa y tu app vencen" / "tu app vence"
  const methodName = m === "efectivo" ? "efectivo" : m === "yappy" ? "Yappy" : "transferencia";
  const proof = founderWhatsApp(`Hola Sebastián, soy de ${b.name}. Renové mi placa NFC y mi app (${plan}) de ${amount} por ${methodName}. Te envío el comprobante.`);
  const cash = founderWhatsApp(`Hola Sebastián, soy de ${b.name}. Quiero renovar mi placa NFC y mi app (${plan}) de ${amount} y pagar en efectivo. ¿Cuándo coordinamos la entrega?`);
  const ask = founderWhatsApp(`Hola Sebastián, soy de ${b.name}. Tengo una duda sobre la renovación de mi plan FiveTap.`);

  const status = !charge
    ? null
    : billing.kind === "suspended"
      ? { tone: "alert-error", text: `${what} ${pl ? "están" : "está"} en pausa desde el ${human(billing.suspendsOn!)}. Renueva y se reactivan el mismo día que confirmemos tu pago.` }
      : billing.daysLate > 0
        ? { tone: "alert-warn", text: `${what} ${pl ? "vencieron" : "venció"} el ${human(charge.due)}. Renueva antes del ${human(billing.suspendsOn!)} para que sigan funcionando.` }
        : billing.daysLate === 0
          ? { tone: "alert-warn", text: `${what} ${pl ? "vencen" : "vence"} hoy.` }
          : billing.daysLate === -1
            ? { tone: "alert-warn", text: `${what} ${pl ? "vencen" : "vence"} mañana.` }
            : { tone: "alert-ok", text: `${what} ${pl ? "vencen" : "vence"} el ${human(charge.due)}.` };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings">
        <div>
          <h1 className="owner-title">Renovar {renewalWhat(plaques, false).replace(/^tus?/, (w) => (w === "tus" ? "mis" : "mi")).replace("tu app", "mi app")}</h1>
          <p className="muted">{b.name}</p>
        </div>

        {!charge ? (
          <section className="panel">
            <div className="msg">
              <p>No tienes pagos pendientes. Tu servicio sigue activo.</p>
              <a className="btn btn-ghost btn-sm" href={ask}>Escribir a FiveTap</a>
            </div>
          </section>
        ) : (
          <>
            {status && <p className={`alert ${status.tone}`} role="status">{status.text}</p>}
            <section className="panel rn-sum">
              <div><small className="muted">Lo que renuevas</small><b>{plaques ? `${plaques} ${plaques === 1 ? "placa NFC" : "placas NFC"} + app FiveTap Business` : "App FiveTap Business"}</b></div>
              <div><small className="muted">Monto</small><b className="num">{amount}</b></div>
              <div><small className="muted">Vence</small><b>{human(charge.due)}</b></div>
            </section>

            <section className="panel">
              <div className="panel-head"><h2>¿Cómo quieres pagar?</h2></div>
              <div className="msg">
                <nav className="cl-tabs rn-methods" aria-label="Forma de pago">
                  {methods.filter((x) => x.on).map((x) => (
                    <Link key={x.key} href={`?m=${x.key}#pago`} className={m === x.key ? "on" : undefined} aria-current={m === x.key ? "true" : undefined}>{x.label}</Link>
                  ))}
                </nav>

                <div id="pago">
                  {!m && <p className="muted">Elige una opción para ver cómo pagar.</p>}
                  {m === "efectivo" && (
                    <div className="rn-box">
                      <p>Coordina con Sebastián el día y el lugar para entregar el efectivo. Al recibirlo, te llega tu recibo.</p>
                      <a className="btn btn-dark" href={cash}>Coordinar pago en efectivo</a>
                    </div>
                  )}
                  {m === "yappy" && yappy && (
                    <div className="rn-box">
                      <p>Envía <b className="num">{amount}</b> por Yappy a:</p>
                      <div className="pay-copy">
                        <span className="pay-big num">{yappy}</span>
                        <CopyButton value={yappy.replace(/[^\d]/g, "").replace(/^507/, "")} />
                      </div>
                      <p className="muted">En el mensaje escribe: {b.name}.</p>
                    </div>
                  )}
                  {m === "transferencia" && bank && (
                    <div className="rn-box">
                      <p>Transfiere <b className="num">{amount}</b> a esta cuenta:</p>
                      <dl className="kv">
                        <dt>Banco</dt><dd>{env.BANK_NAME}</dd>
                        {env.BANK_ACCOUNT_NAME && (<><dt>Titular</dt><dd>{env.BANK_ACCOUNT_NAME}</dd></>)}
                        {env.BANK_ACCOUNT_TYPE && (<><dt>Tipo</dt><dd>{env.BANK_ACCOUNT_TYPE}</dd></>)}
                        <dt>Cuenta</dt><dd className="num">{bank}</dd>
                      </dl>
                      <div><CopyButton value={bank} label="Copiar número de cuenta" /></div>
                      <p className="muted">En la descripción escribe: {b.name}.</p>
                    </div>
                  )}
                  {(m === "yappy" || m === "transferencia") && (
                    <a className="btn btn-dark btn-block rn-proof" href={proof}>Enviar comprobante a Sebastián</a>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        <section className="panel rn-contact">
          <div>
            <b>¿Dudas o quieres cambiar tu plan?</b>
            <span className="muted">Sebastián Vera · Fundador de FiveTap · WhatsApp {FOUNDER_PHONE}</span>
          </div>
          <a className="btn btn-ghost btn-sm" href={ask}>Escribir por WhatsApp</a>
        </section>
        <p className="muted" style={{ fontSize: 13 }}>Cuando confirmamos tu pago lo registramos y te llega tu recibo. Puedes ver todos tus pagos en <Link href={`${home}/pagos`} style={{ textDecoration: "underline" }}>Facturación y pagos</Link>.</p>
      </main>
    </div>
  );
}
