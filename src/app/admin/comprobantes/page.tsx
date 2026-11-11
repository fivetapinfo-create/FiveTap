import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { human, todayPanama } from "@/lib/agenda";
import { emailReady } from "@/lib/email";
import { customMethods, listReceipts, receiptMoney, recentAudit } from "@/lib/receipts";
import { db } from "@/lib/supabase";
import { addPaymentMethod, removePaymentMethod, resendReceipt } from "../actions";
import { Flash } from "../Flash";
import { dateTime } from "../format";

export const dynamic = "force-dynamic";

const ACTION: Record<string, string> = {
  "payment.recorded": "Pago registrado",
  "payment.voided": "Pago anulado",
  "receipt.issued": "Comprobante emitido",
  "receipt.sent": "Comprobante enviado",
  "grace.extended": "Días extra de plazo",
  "method.added": "Método de pago agregado",
  "method.removed": "Método de pago quitado",
};
const SEND = { sent: "Enviado", failed: "Falló", skipped: "No enviado" } as const;

/** Every receipt issued, who got it and when, the founder's own payment methods and the audit log. */
export default async function Receipts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [rows, log, methods, sp, biz] = await Promise.all([listReceipts(), recentAudit(), customMethods(), searchParams, db().from("businesses").select("id, name")]);
  const month = todayPanama().slice(0, 7);
  const paid = rows.filter((r) => r.receipt.status === "paid");
  const thisMonth = paid.filter((r) => r.receipt.paid_on.startsWith(month));
  const failed = rows.filter((r) => r.sends.at(0)?.status === "failed").length;
  const names = new Map([...rows.filter((r) => r.receipt.business_id).map((r) => [r.receipt.business_id!, r.receipt.venue_name] as const), ...((biz.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name] as const)]);

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Comprobantes</h1>
          <p>Uno por cada pago registrado. Son comprobantes de pago, no facturas fiscales.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      {!emailReady() && (
        <p className="alert alert-warn">El correo todavía no está configurado: los comprobantes llegan a la app FiveTap Business y puedes enviarlos por WhatsApp. Para enviarlos por correo hace falta el dominio y una cuenta gratis de Resend.</p>
      )}

      <div className="kpis">
        <div className="kpi"><span>Comprobantes emitidos</span><b className="num">{paid.length}</b></div>
        <div className="kpi"><span>Cobrado este mes</span><b className="num">{receiptMoney(thisMonth.reduce((n, r) => n + Number(r.receipt.amount), 0))}</b><small className="muted">{thisMonth.length} pago{thisMonth.length === 1 ? "" : "s"}</small></div>
        <div className="kpi"><span>Anulados</span><b className="num">{rows.length - paid.length}</b></div>
        <div className="kpi"><span>Envíos fallidos</span><b className="num">{failed}</b></div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Todos los comprobantes</h2></div>
        {rows.length === 0 ? (
          <div className="empty"><p>Todavía no hay comprobantes. Se emiten solos al registrar un pago en la ficha de cada negocio.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>N.º</th><th>Negocio</th><th>Pago</th><th className="right">Monto</th><th>Envíos</th><th /></tr>
              </thead>
              <tbody>
                {rows.map(({ receipt: r, sends }) => (
                  <tr key={r.id} className={r.status === "void" ? "muted" : undefined}>
                    <td>
                      <a href={`/recibo/${r.token}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}><b>{r.number}</b></a>
                      {r.status === "void" && <> <span className="pill canceled">Anulado</span></>}
                    </td>
                    <td>{r.business_id ? <Link href={`/admin/b/${r.business_id}#pagos`}>{r.venue_name}</Link> : r.venue_name}<br /><small className="muted">{r.plan_label}</small></td>
                    <td>{human(r.paid_on)}<br /><small className="muted">{r.concept} · {r.method}</small></td>
                    <td className="right num"><b>{r.status === "void" ? <s>{receiptMoney(r.amount)}</s> : receiptMoney(r.amount)}</b></td>
                    <td>
                      {sends.length ? sends.slice(0, 3).map((s) => (
                        <small key={s.id} className="muted" style={{ display: "block" }} title={s.detail ?? ""}>
                          {s.channel === "email" ? "Correo" : "App"} · {SEND[s.status]}{s.recipient && s.channel === "email" ? ` · ${s.recipient}` : ""} · {dateTime(s.created_at)}
                        </small>
                      )) : <small className="muted">Sin enviar</small>}
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}/pdf?dl=1`}>PDF</a>
                        {r.status === "paid" && (
                          <form action={resendReceipt}>
                            <input type="hidden" name="receipt_id" value={r.id} />
                            <input type="hidden" name="back" value="/admin/comprobantes" />
                            <SubmitButton className="btn btn-ghost btn-sm" pending="Enviando…">Reenviar</SubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" id="metodos">
        <div className="panel-head"><h2>Métodos de pago</h2></div>
        <div className="msg">
          <p className="muted">Siempre disponibles: Yappy, Efectivo, Transferencia bancaria, PayPal y Tarjeta. Agrega otros y aparecerán al registrar un pago.</p>
          {methods.length > 0 && (
            <div className="row">
              {methods.map((m) => (
                <form key={m.id} action={removePaymentMethod} className="row" style={{ gap: 4 }}>
                  <input type="hidden" name="id" value={m.id} />
                  <span className="pill">{m.label}</span>
                  <SubmitButton className="btn btn-ghost btn-sm" pending="…">Quitar</SubmitButton>
                </form>
              ))}
            </div>
          )}
          <form action={addPaymentMethod} className="row">
            <input className="input" name="label" required minLength={2} maxLength={40} placeholder="Ej. Nequi, Cheque" style={{ maxWidth: 240 }} />
            <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">Agregar método</SubmitButton>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Historial de cambios</h2><span className="muted">Últimos {log.length}</span></div>
        {log.length === 0 ? (
          <div className="empty"><p>Aquí queda cada pago registrado o anulado, cada comprobante enviado y cada plazo extra.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {log.map((a) => {
                  const d = a.details as Record<string, string | number | null>;
                  return (
                    <tr key={a.id}>
                      <td className="muted">{dateTime(a.at)}</td>
                      <td><b>{ACTION[a.action] ?? a.action}</b>{a.entity === "receipt" && a.entity_id ? ` · ${a.entity_id}` : ""}</td>
                      <td>{a.business_id ? names.get(a.business_id) ?? "" : a.entity === "payment_method" ? a.entity_id : ""}</td>
                      <td className="muted">
                        {[d.amount != null ? receiptMoney(Number(d.amount)) : null, d.method_label ?? d.method ?? null, d.reason ? `Motivo: ${d.reason}` : null, d.until ? `hasta el ${human(String(d.until))}` : null, d.email ? `correo: ${SEND[d.email as keyof typeof SEND] ?? d.email}` : null, d.push ? `app: ${SEND[d.push as keyof typeof SEND] ?? d.push}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
