import type { Metadata } from "next";
import Link from "next/link";
import { AccessGate } from "@/components/AccessGate";
import { accessRole } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BILLING_LABEL, billingState, human, planLabel } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { getPlans } from "@/lib/plans";
import { receiptMoney, receiptsForBusiness } from "@/lib/receipts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Facturación y pagos · FiveTap",
    robots: { index: false, follow: false },
    manifest: `/mi/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "FiveTap", statusBarStyle: "black" },
  };
}

/**
 * The owner's billing: plan, next payment and every receipt, read only. Only this
 * venue's receipts (looked up by the venue behind the private link). Open even while
 * the service is paused, so the owner can see what is owed and pay.
 */
export default async function OwnerBilling({ params }: Props) {
  const { token } = await params;
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  // Payments are the owner's: the manager goes back to the summary.
  if (role !== "owner") redirect(`/mi/${token}`);
  const [d, receipts, plans] = await Promise.all([businessDetail(b.id), receiptsForBusiness(b.id), getPlans()]);
  if (!d) notFound();
  const billing = billingState(b, d.payments);
  const c = billing.charge;
  const plan = planLabel(b, c, d.tags.filter((t) => t.active).length, plans);
  const home = `/mi/${token}`;
  const paid = receipts.filter((r) => r.status === "paid");
  const total = paid.reduce((n, r) => n + Number(r.amount), 0);
  const pill = billing.kind === "late" || billing.kind === "suspended" || billing.kind === "soon" ? `bill-${billing.kind}` : billing.kind === "ok" ? "active" : b.status;

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
          <h1 className="owner-title">Facturación y pagos</h1>
          <p className="muted">{b.name}</p>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Tu plan</h2>
            <span className={`pill ${pill}`}>{BILLING_LABEL[billing.kind]}</span>
          </div>
          <dl className="kv settings-kv">
            <dt>Plan</dt>
            <dd>{plan}</dd>
            {c && b.status !== "canceled" && (
              <>
                <dt>{billing.daysLate > 0 ? "Pago pendiente desde" : "Próximo vencimiento"}</dt>
                <dd>{human(c.due)} · <b>{receiptMoney(c.amount)}</b></dd>
                {billing.kind === "late" && billing.suspendsOn && (
                  <>
                    <dt>Paga antes del</dt>
                    <dd>{human(billing.suspendsOn)} para que tus placas sigan funcionando</dd>
                  </>
                )}
                <dt>Forma de pago</dt>
                <dd>{c.auto ? "PayPal · se cobra solo" : "Yappy, transferencia, efectivo o tarjeta"}</dd>
              </>
            )}
            <dt>Total pagado</dt>
            <dd>{receiptMoney(total)} · {paid.length} {paid.length === 1 ? "pago" : "pagos"}</dd>
          </dl>
          {c && !c.auto && b.status !== "canceled" && (
            <div className="msg"><a className="btn btn-dark btn-sm" style={{ width: "fit-content" }} href={`/pagar?n=${encodeURIComponent(b.name)}`}>Ver cómo pagar</a></div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Comprobantes</h2></div>
          {receipts.length === 0 ? (
            <div className="empty"><p>Aquí aparecerá el comprobante de cada pago en cuanto lo confirmemos. También te avisamos con una notificación.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className={r.status === "void" ? "muted" : undefined}>
                      <td>
                        <b>{human(r.paid_on)}</b>
                        <br />
                        <small className="muted">{r.number} · {r.concept} · {r.method}</small>
                      </td>
                      <td className="right num">
                        {r.status === "void" ? <><s>{receiptMoney(r.amount)}</s><br /><small>Anulado</small></> : <b>{receiptMoney(r.amount)}</b>}
                      </td>
                      <td className="right">
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}`}>Ver</a>
                          <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}/pdf?dl=1`}>PDF</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="msg">
            <p className="muted owner-note">Son comprobantes de pago de FiveTap; no sustituyen una factura fiscal. Si ves un error, escríbenos y lo corregimos.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
