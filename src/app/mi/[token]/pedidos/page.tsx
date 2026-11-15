import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { NEXT, STATUS_LABEL, moduleOn, ordersFor, type GuestOrder, type OrderStatus } from "@/lib/orders";
import { salesWhatsAppUrl } from "@/lib/site";
import { adjustOrderLine, moveOrder } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; ver?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Pedidos · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

const ACTION: Partial<Record<OrderStatus, string>> = { new: "Aceptar y preparar", preparing: "Marcar listo", ready: "Entregado" };
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const since = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`;
};
const TABS: { key: string; label: string; match: (o: GuestOrder) => boolean }[] = [
  { key: "activos", label: "En curso", match: (o) => o.status === "new" || o.status === "preparing" || o.status === "ready" },
  { key: "cerrados", label: "Entregados y cancelados (24 h)", match: (o) => o.status === "delivered" || o.status === "canceled" },
];

/** Orders placed from the plaques, live: accept, prepare, mark ready, deliver, adjust or cancel. */
export default async function OrdersPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await accessRole(b))) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const on = moduleOn(b, "orders");
  const orders = on ? await ordersFor(b.id) : [];
  const tab = TABS.find((t) => t.key === sp.ver) ?? TABS[0]!;
  const shown = orders.filter(tab.match);
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const today = orders.filter((o) => o.status === "delivered").reduce((n, o) => n + o.total, 0);

  return (
    <div className="admin">
      {on && <LiveRefresh seconds={10} />}
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings">
        <div>
          <h1 className="owner-title">Pedidos</h1>
          <p className="muted">Llegan desde tus placas con la mesa ya puesta. Esta página se actualiza sola.</p>
        </div>
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
        {!on ? (
          <div className="panel"><div className="empty">
            <p>Los pedidos desde la placa no están activos en tu plan. Tus clientes podrían ver tu menú y pedir desde la mesa, y tú los recibirías aquí al instante.</p>
            <a className="btn btn-dark" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Quiero activar los pedidos desde la placa.`)}>Quiero activarlos</a>
          </div></div>
        ) : (
          <>
            <div className="kpis orders-kpis">
              <div className={`kpi${count("new") ? " kpi-alert" : ""}`}><span>Nuevos</span><b className="num">{count("new")}</b></div>
              <div className="kpi"><span>En preparación</span><b className="num">{count("preparing")}</b></div>
              <div className="kpi"><span>Listos</span><b className="num">{count("ready")}</b></div>
              <div className="kpi"><span>Entregado (24 h)</span><b className="num">{usd(today)}</b><small className="muted">Según pedidos, no es dinero cobrado</small></div>
            </div>
            <nav className="piece-filters" aria-label="Pedidos">
              {TABS.map((t) => <Link key={t.key} href={`/mi/${token}/pedidos${t.key === "activos" ? "" : `?ver=${t.key}`}`} aria-current={t.key === tab.key ? "page" : undefined}>{t.label} <b className="num">{orders.filter(t.match).length}</b></Link>)}
            </nav>
            {shown.length === 0 ? (
              <div className="panel"><div className="empty"><p>{tab.key === "activos" ? "No hay pedidos en curso. Cuando un cliente pida desde una placa, aparece aquí y te llega un aviso al celular." : "Nada en las últimas 24 horas."}</p></div></div>
            ) : (
              <div className="orders">
                {shown.map((o) => {
                  const next = NEXT[o.status];
                  const editable = o.status === "new" || o.status === "preparing";
                  return (
                    <article key={o.id} id={`p-${o.id}`} className={`panel order order-${o.status}`}>
                      <header className="order-head">
                        <div>
                          <b className="order-num num">#{o.number}</b>
                          <span className="order-where">{o.table_label}</span>
                        </div>
                        <span className={`order-pill order-pill-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                      </header>
                      <p className="order-who">{o.customer_name}{o.people ? ` · ${o.people} ${o.people === 1 ? "persona" : "personas"}` : ""} · <span className="muted">{since(o.created_at)}</span>{o.modified ? <span className="muted"> · modificado</span> : null}</p>
                      <ul className="order-lines">
                        {o.lines.map((l) => (
                          <li key={l.id} className={l.qty === 0 ? "removed" : undefined}>
                            <span><b className="num">{l.qty}×</b> {l.name}</span>
                            <span className="num">{usd(l.line_total)}</span>
                            {editable && (
                              <details className="order-adjust">
                                <summary>Ajustar</summary>
                                <form action={adjustOrderLine} className="row">
                                  <input type="hidden" name="token" value={token} />
                                  <input type="hidden" name="order_id" value={o.id} />
                                  <input type="hidden" name="line_id" value={l.id} />
                                  <input className="input" type="number" name="qty" min={0} max={50} defaultValue={l.qty} aria-label={`Cantidad de ${l.name}`} style={{ width: 80 }} />
                                  <SubmitButton className="btn btn-ghost btn-sm" pending="…">Guardar</SubmitButton>
                                </form>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="order-notes">“{o.notes}”</p>}
                      <div className="order-foot">
                        <b className="num">Total {usd(o.total)}</b>
                        <div className="row">
                          {o.status !== "delivered" && o.status !== "canceled" && (
                            <details className="order-cancel">
                              <summary className="btn btn-ghost btn-sm">Cancelar</summary>
                              <form action={moveOrder} className="row">
                                <input type="hidden" name="token" value={token} />
                                <input type="hidden" name="order_id" value={o.id} />
                                <input type="hidden" name="to" value="canceled" />
                                <input className="input" name="reason" maxLength={200} placeholder="Motivo (opcional)" />
                                <SubmitButton className="btn btn-danger btn-sm" pending="…">Cancelar pedido</SubmitButton>
                              </form>
                            </details>
                          )}
                          {next && (
                            <form action={moveOrder}>
                              <input type="hidden" name="token" value={token} />
                              <input type="hidden" name="order_id" value={o.id} />
                              <input type="hidden" name="to" value={next} />
                              <SubmitButton className="btn btn-dark btn-sm" pending="…">{ACTION[o.status]}</SubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                      {o.status === "canceled" && o.cancel_reason && <p className="muted order-notes">Motivo: {o.cancel_reason}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
