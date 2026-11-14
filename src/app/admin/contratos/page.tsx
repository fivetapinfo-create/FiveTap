import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { AGREEMENT_METHODS, SIGNER_ROLES, longDay, money2 } from "@/lib/agreement";
import { listAgreements } from "@/lib/agreements-db";
import { todayPanama } from "@/lib/agenda";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/supabase";
import { PLAN_TEST_PRODUCTS, type PlanTestProduct } from "@/lib/test-kit";
import { customMethods, receiptMoney } from "@/lib/receipts";
import { createAgreement, createOrder, deleteAgreement, payOrder, sendReceiptWhatsApp } from "../actions";
import { OrderForm } from "./OrderForm";
import { Flash } from "../Flash";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ok?: string; error?: string; b?: string; c?: string }> };
type Biz = { id: string; name: string; billing_name: string | null; manager_name: string | null; billing_phone: string | null; manager_phone: string | null; status: string };
type Order = { id: string; number: string; business_id: string | null; business_name: string; customer_name: string | null; product: PlanTestProduct; quantity: number; unit_price: number; total: number; purchased_on: string; method: string; method_label: string | null; pay_status: "pending" | "paid" | "void"; payment_id: string | null; notes: string | null };
const METHOD_NAME: Record<string, string> = { yappy: "Yappy", cash: "Efectivo", ach: "Transferencia", card: "Tarjeta", paypal: "PayPal" };

/** 3-month contracts: create one from a business, preview, download and send it. */
export default async function Contracts({ searchParams }: Props) {
  const [sp, list, bizRes, orderRes, methods] = await Promise.all([
    searchParams,
    listAgreements(),
    db().from("businesses").select("id, name, billing_name, manager_name, billing_phone, manager_phone, status").neq("status", "canceled").order("name"),
    db().from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    customMethods(),
  ]);
  const orders = (orderRes.data ?? []) as Order[];
  const paidIds = orders.map((o) => o.payment_id).filter((x): x is string => Boolean(x));
  const receipts = new Map(
    (paidIds.length ? (((await db().from("receipts").select("id, number, token, payment_id, status").in("payment_id", paidIds)).data ?? []) as { id: string; number: string; token: string; payment_id: string; status: string }[]) : []).map((r) => [r.payment_id, r]),
  );
  const businesses = (bizRes.data ?? []) as Biz[];
  const chosen = businesses.find((b) => b.id === sp.b) ?? null;
  const today = todayPanama();
  const phoneOf = (id: string | null) => {
    const b = businesses.find((x) => x.id === id);
    return b?.billing_phone || b?.manager_phone || null;
  };

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Contratos</h1>
          <p>Contrato de 3 meses para que el local compruebe los resultados. Al terminar, renuevan por el período que acuerden.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      <p className="alert alert-warn">Redactado con criterio legal y en palabras simples, pero no sustituye a un abogado: haz que uno de Panamá lo revise antes de firmar con clientes.</p>
      <div className="row">
        <span className="muted">Contrato de ejemplo para mostrar:</span>
        <a className="btn btn-ghost btn-sm" href="/admin/contratos/ejemplo?plan=start" target="_blank" rel="noreferrer">Start</a>
        <a className="btn btn-ghost btn-sm" href="/admin/contratos/ejemplo?plan=pro" target="_blank" rel="noreferrer">Pro</a>
        <a className="btn btn-ghost btn-sm" href="/admin/contratos/ejemplo?plan=enterprise" target="_blank" rel="noreferrer">Enterprise</a>
      </div>

      <nav className="biz-tabs" aria-label="Secciones de contratos">
        <a href="#plan-test">Plan Test · compras individuales</a>
        <a href="#nuevo">Contrato de 3 meses</a>
        <a href="#lista">Contratos emitidos</a>
      </nav>

      <section className="panel" id="plan-test">
        <div className="panel-head">
          <h2>Plan Test · compras individuales</h2>
          <span className="muted">Venta única, sin mensualidad</span>
        </div>
        {businesses.length === 0 ? (
          <div className="empty"><p>Primero crea el negocio (plan Personalizado si solo compra piezas).</p><Link className="btn btn-dark" href="/admin/new">+ Nuevo negocio</Link></div>
        ) : (
          <OrderForm
            businesses={businesses.map((b) => ({ id: b.id, name: b.name, contact: b.billing_name || b.manager_name || "" }))}
            methods={methods.map((m) => m.label)}
            today={today}
            action={createOrder}
          />
        )}
        {orders.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>N.º</th><th>Negocio</th><th>Producto</th><th className="right">Cant.</th><th className="right">Total</th><th>Pago</th><th /></tr></thead>
              <tbody>
                {orders.map((o) => {
                  const r = o.payment_id ? receipts.get(o.payment_id) : undefined;
                  return (
                    <tr key={o.id}>
                      <td><b>{o.number}</b><br /><small className="muted">{longDay(o.purchased_on)}</small></td>
                      <td>{o.business_id ? <Link href={`/admin/b/${o.business_id}#pagos`}>{o.business_name}</Link> : <>{o.business_name} <small className="muted">(eliminado)</small></>}{o.customer_name ? <><br /><small className="muted">{o.customer_name}</small></> : null}</td>
                      <td>{PLAN_TEST_PRODUCTS[o.product].short}<br /><small className="muted">{receiptMoney(Number(o.unit_price))} c/u{o.notes ? ` · ${o.notes}` : ""}</small></td>
                      <td className="right num">{o.quantity}</td>
                      <td className="right num"><b>{receiptMoney(Number(o.total))}</b></td>
                      <td>
                        <span className={`pill ${o.pay_status === "paid" ? "active" : "trial"}`}>{o.pay_status === "paid" ? "Pagado" : o.pay_status === "void" ? "Anulado" : "Pendiente"}</span>
                        <br /><small className="muted">{o.method === "other" ? o.method_label : METHOD_NAME[o.method]}</small>
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          {r ? (
                            <>
                              <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}/pdf?dl=1`}>Recibo {r.number}</a>
                              <form action={sendReceiptWhatsApp}>
                                <input type="hidden" name="receipt_id" value={r.id} />
                                <input type="hidden" name="back" value="/admin/contratos#plan-test" />
                                <SubmitButton className="btn btn-ghost btn-sm" pending="…">WhatsApp</SubmitButton>
                              </form>
                            </>
                          ) : o.pay_status === "pending" && o.business_id ? (
                            <form action={payOrder} className="row" style={{ gap: 6 }}>
                              <input type="hidden" name="order_id" value={o.id} />
                              <input type="hidden" name="send" value="1" />
                              <label className="check" style={{ fontSize: 13 }}><input type="checkbox" name="confirm" value="1" required /> Ya pagó</label>
                              <SubmitButton className="btn btn-dark btn-sm" pending="…">Marcar pagado</SubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" id="nuevo">
        <div className="panel-head"><h2>Nuevo contrato de 3 meses</h2></div>
        {businesses.length === 0 ? (
          <div className="empty"><p>Primero crea el negocio. El contrato toma de ahí el plan, el precio y las placas y tarjetas.</p><Link className="btn btn-dark" href="/admin/new">+ Nuevo negocio</Link></div>
        ) : (
          <form action={createAgreement} className="form-section">
            <div className="grid-2">
              <label className="field">
                <span>Negocio</span>
                <select className="select" name="business_id" defaultValue={chosen?.id ?? ""} required>
                  <option value="" disabled>Elige el negocio</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Fecha de inicio</span>
                <input className="input" type="date" name="start_date" defaultValue={today} required />
              </label>
              <label className="field">
                <span>Firma por el local</span>
                <input className="input" name="signer_name" required minLength={3} maxLength={100} defaultValue={chosen?.billing_name || chosen?.manager_name || ""} placeholder="Nombre y apellido" />
              </label>
              <label className="field">
                <span>Cargo</span>
                <select className="select" name="signer_role" defaultValue={SIGNER_ROLES[0]}>
                  {SIGNER_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Forma de pago</span>
                <select className="select" name="payment_method" defaultValue={AGREEMENT_METHODS[0]}>
                  {AGREEMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Dirección del local (opcional)</span>
                <input className="input" name="venue_address" maxLength={160} placeholder="Calle 50, local 7B" />
              </label>
            </div>
            <small className="muted">El plan, la mensualidad y las placas y tarjetas se toman del negocio tal como están hoy.</small>
            <SubmitButton className="btn btn-dark" pending="Creando…">Crear contrato</SubmitButton>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Contratos · {list.length}</h2></div>
        {list.length === 0 ? (
          <div className="empty"><p>Todavía no hay contratos.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>N.º</th><th>Negocio</th><th>Plan</th><th>Vigencia</th><th /></tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const link = `${SITE_URL}/contrato/${a.token}/pdf`;
                  const phone = phoneOf(a.business_id);
                  const status = a.end_date < today ? "Terminado" : a.start_date > today ? "Por empezar" : "Vigente";
                  return (
                    <tr key={a.id} className={sp.c === a.id ? "row-new" : undefined}>
                      <td><b>{a.number}</b></td>
                      <td>{a.business_id ? <Link href={`/admin/b/${a.business_id}`}>{a.venue_name}</Link> : a.venue_name}<br /><small className="muted">Firma: {a.signer_name}</small></td>
                      <td>{a.plan_name}<br /><small className="muted">{money2(a.monthly_fee)}/mes · {a.plaques} placas · {a.cards} tarjetas</small></td>
                      <td>{longDay(a.start_date)} al {longDay(a.end_date)}<br /><small className="muted">{status}</small></td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <a className="btn btn-ghost btn-sm" href={`/admin/contratos/${a.id}/pdf`} target="_blank" rel="noreferrer">Ver</a>
                          <a className="btn btn-ghost btn-sm" href={`/admin/contratos/${a.id}/pdf?dl=1`}>PDF</a>
                          <details className="void-box">
                            <summary className="btn btn-ghost btn-sm">Borrar</summary>
                            <form action={deleteAgreement} className="void-form">
                              <input type="hidden" name="id" value={a.id} />
                              <small className="muted">Solo si lo creaste por error. Queda registrado en el historial.</small>
                              <SubmitButton className="btn btn-danger btn-sm" pending="Borrando…">Borrar {a.number}</SubmitButton>
                            </form>
                          </details>
                          {phone && (
                            <a className="btn btn-ghost btn-sm" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hola, te escribe FiveTap. Este es el contrato de 3 meses de ${a.venue_name} para revisarlo antes de firmar: ${link}`)}`}>Enviar por WhatsApp</a>
                          )}
                        </div>
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
