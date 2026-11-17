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
import { Receipt as ReceiptAnim } from "@/components/Receipt";
import { SubmitButton } from "@/components/SubmitButton";
import { CLAIM_METHOD, claimsFor } from "@/lib/claims";
import { METHOD_LABEL, receiptsForBusiness } from "@/lib/receipts";
import { reportRenewal } from "../actions";

export const dynamic = "force-dynamic";

type Method = "efectivo" | "yappy" | "transferencia";
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string; ok?: string; error?: string; recibo?: string }> };

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
  const [d, plans, claims, receipts] = await Promise.all([businessDetail(b.id), getPlans(), claimsFor(b.id), receiptsForBusiness(b.id)]);
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
  // Where the renewal stands: reported and waiting, refused, or confirmed with its receipt.
  const pending = claims.find((c) => c.status === "pending") ?? null;
  const lastClaim = claims[0] ?? null;
  const rejected = lastClaim?.status === "rejected" ? lastClaim : null;
  const DAY = 86_400_000;
  const confirmed = claims.find((c) => c.status === "confirmed" && c.payment_id && c.decided_at && Date.now() - Date.parse(c.decided_at) < 30 * DAY) ?? null;
  const shown = (sp.recibo && receipts.find((r) => r.number === sp.recibo && r.status === "paid")) || (confirmed && receipts.find((r) => r.payment_id === confirmed.payment_id && r.status === "paid")) || null;
  const animateReceipt = Boolean(sp.recibo && shown);
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

        {sp.ok === "enviado" && <p className="alert alert-ok" role="status">Listo: le avisamos a Sebastián. En cuanto confirme tu pago, te llega el aviso y tu recibo.</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        {shown && (
          <section className="rn-receipt" id="recibo">
            <ReceiptAnim
              animate={animateReceipt}
              homeHref={home}
              data={{
                item: shown.concept,
                detail: shown.plan_label,
                amount: Number(shown.amount),
                per: "",
                venue: shown.venue_name,
                order: shown.number,
                orderLabel: "Recibo",
                paidWith: (METHOD_LABEL as Record<string, string>)[shown.method] ?? shown.method,
                date: human(shown.paid_on),
                extra: [
                  ...(shown.period_start && shown.period_end ? [["Período", `${human(shown.period_start)} – ${human(shown.period_end)}`] as [string, string]] : []),
                  ["Estado", "Pagado y confirmado"],
                  ...(shown.reference ? [["Transacción", shown.reference] as [string, string]] : []),
                ],
                thanks: `¡Gracias por seguir con FiveTap, ${shown.venue_name}! Tu placa NFC y tu app siguen activas.`,
              }}
              actions={
                <>
                  <b className="rc-save-title">GUARDAR FACTURA</b>
                  <div className="rc-save">
                    <a className="btn btn-dark" href={`/recibo/${shown.token}/pdf?dl=1`}>PDF</a>
                    <a className="btn btn-ghost" href={`/recibo/${shown.token}/imagen?dl=1`}>Imagen</a>
                  </div>
                  <small className="muted">Es tu recibo oficial {shown.number}. También queda en Facturación y pagos.</small>
                </>
              }
            />
          </section>
        )}

        {pending ? (
          <section className="panel rn-wait" id="estado">
            <div className="panel-head"><h2>Tu pago está en verificación</h2></div>
            <ol className="rn-steps" aria-label="Estado del pago">
              <li className="done"><b>Aviso enviado</b><small>{CLAIM_METHOD[pending.method]} · {money(Number(pending.amount))}{pending.reference ? ` · ref. ${pending.reference}` : ""}</small></li>
              <li className="now"><b>Verificando el pago</b><small>Sebastián confirma que el dinero llegó.</small></li>
              <li><b>Confirmado y recibo listo</b><small>Te llega un aviso para guardar tu factura.</small></li>
            </ol>
            <div className="msg"><a className="btn btn-ghost btn-sm" href={founderWhatsApp(`Hola Sebastián, soy de ${b.name}. Te aviso que pagué ${money(Number(pending.amount))} por ${CLAIM_METHOD[pending.method]}. Te envío el comprobante.`)}>Enviar comprobante por WhatsApp</a></div>
          </section>
        ) : !charge ? (
          !shown && (
            <section className="panel">
              <div className="msg">
                <p>No tienes pagos pendientes. Tu servicio sigue activo.</p>
                <a className="btn btn-ghost btn-sm" href={ask}>Escribir a FiveTap</a>
              </div>
            </section>
          )
        ) : (
          <>
            {rejected && <p className="alert alert-error" role="alert">No pudimos confirmar tu último aviso de pago: {rejected.reason} Revisa y vuelve a avisarnos.</p>}
            {status && <p className={`alert ${status.tone}`} role="status">{status.text}</p>}
            <section className="panel rn-sum">
              <div><small className="muted">Lo que renuevas</small><b>{plaques ? `${plaques} ${plaques === 1 ? "placa NFC" : "placas NFC"} + app FiveTap Business` : "App FiveTap Business"}</b></div>
              <div><small className="muted">Monto</small><b className="num">{amount}</b>{charge.loyalty && <small className="rn-loyal">Premio de lealtad: {charge.loyalty.pct}% menos ({charge.loyalty.n} de {charge.loyalty.of}) · antes {money(charge.loyalty.regular)}</small>}</div>
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
                  {m && (
                    <form action={reportRenewal} className="rn-report">
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="method" value={m === "efectivo" ? "cash" : m === "yappy" ? "yappy" : "ach"} />
                      {m !== "efectivo" && (
                        <label className="field"><span>Número de operación (opcional)</span><input className="input" name="reference" maxLength={120} placeholder="Lo ves en tu comprobante" autoComplete="off" /></label>
                      )}
                      <SubmitButton className="btn btn-dark btn-block" pending="Enviando…">{m === "efectivo" ? "Ya entregué el efectivo" : "Ya pagué"}</SubmitButton>
                      <small className="muted">Tu pago queda en verificación hasta que Sebastián confirme que llegó. Después te llega tu recibo.</small>
                      {m !== "efectivo" && <a className="btn btn-ghost btn-sm" href={proof}>Enviar también el comprobante por WhatsApp</a>}
                    </form>
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
