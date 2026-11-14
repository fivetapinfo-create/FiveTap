import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { human } from "@/lib/agenda";
import { receiptByToken, receiptMoney } from "@/lib/receipts";
import { FOUNDER_PHONE, founderWhatsApp } from "@/lib/test-kit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recibo de pago — FiveTap", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ token: string }> };

/** A payment receipt opened from its private link (email, app or WhatsApp). Read only. */
export default async function ReceiptPage({ params }: Props) {
  const r = await receiptByToken((await params).token);
  if (!r) notFound();
  const paid = r.status === "paid";
  const rows: [string, string][] = [
    ["Negocio", r.venue_name],
    ...(r.owner_name ? ([["Propietario", r.owner_name]] as [string, string][]) : []),
    ["Plan contratado", r.plan_label],
    ...(r.items?.length
      ? r.items.map((it) => [it.name, `${it.qty} × ${receiptMoney(it.unit)} = ${receiptMoney(it.total)}`] as [string, string])
      : ([["Placas NFC", String(r.plaques)], ["Concepto", r.concept]] as [string, string][])),
    ["Método de pago", r.method],
    ...(r.reference ? ([["Referencia", r.reference]] as [string, string][]) : []),
    ["Fecha de pago", human(r.paid_on)],
    ...(r.period_start && r.period_end ? ([["Período pagado", `${human(r.period_start)} al ${human(r.period_end)}`]] as [string, string][]) : []),
    ...(r.service_start ? ([["Inicio del servicio", human(r.service_start)]] as [string, string][]) : []),
    ...(r.next_due ? ([["Próximo vencimiento", human(r.next_due)]] as [string, string][]) : []),
    ["Moneda", r.currency],
  ];
  return (
    <main className="receipt-page">
      <Logo />
      <section className="receipt-card">
        <span className={`receipt-status ${paid ? "" : "void"}`}>{paid ? "PAGADO" : "ANULADO"}</span>
        <div>
          <p className="muted">Recibo de pago {r.number}</p>
          <p className="receipt-amount num">{receiptMoney(r.amount)} <small style={{ fontSize: 16 }}>{r.currency}</small></p>
        </div>
        <dl className="receipt-rows">
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {!paid && <p className="alert alert-error">Este comprobante fue anulado{r.void_reason ? `: ${r.void_reason}` : ""}. No es válido como constancia de pago.</p>}
        <a className="btn btn-dark" href={`/recibo/${r.token}/pdf?dl=1`}>Descargar PDF</a>
        <a className="btn btn-ghost" href={founderWhatsApp(`Hola FiveTap, tengo una consulta sobre mi recibo ${r.number}.`)}>¿Dudas? WhatsApp FiveTap {FOUNDER_PHONE}</a>
      </section>
      <p className="receipt-note">Emitido por FiveTap el {human(new Date(Date.parse(r.issued_at) - 5 * 3600_000).toISOString().slice(0, 10))}. Es un recibo de pago y no sustituye una factura fiscal.</p>
    </main>
  );
}
