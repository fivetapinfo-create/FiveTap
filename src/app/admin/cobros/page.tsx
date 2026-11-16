import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { BILLING_LABEL, billingAll, human, planLabel, todayPanama, type BillingKind } from "@/lib/agenda";
import { getPlans } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import { decideClaim, extendGrace } from "../actions";
import { CLAIM_METHOD, pendingClaims } from "@/lib/claims";
import { dateTime } from "../format";
import { Flash } from "../Flash";
import { usd } from "../format";

export const dynamic = "force-dynamic";

const ORDER: BillingKind[] = ["suspended", "late", "soon", "ended", "trial", "paused", "ok"];
const HINT: Partial<Record<BillingKind, string>> = {
  suspended: "Placas y app pausadas. Se reactivan solas al registrar el pago.",
  late: "En los 5 días de gracia: todo sigue funcionando hasta la fecha de pausa.",
  soon: "Vencen en 3 días o menos.",
  paused: "Pausados a mano en Editar datos. No reciben recordatorios.",
  trial: "FiveTap Test: válido 30 días, se cierra solo el día 29. Luego se pausan hasta que elijan un plan.",
  ended: "Terminó su FiveTap Test: ofréceles un plan.",
  ok: "Al día.",
};

/** Who owes what: suspended, late (in grace), due soon, paused and up to date. */
export default async function Collections({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [rows, sp, plans, claims] = await Promise.all([billingAll(), searchParams, getPlans(), pendingClaims()]);
  const today = todayPanama();
  const owed = (k: BillingKind[]) => rows.filter((r) => k.includes(r.billing.kind));
  const sum = (list: typeof rows) => list.reduce((n, r) => n + Number(r.billing.charge?.amount ?? 0), 0);
  const unpaid = owed(["late", "suspended"]);

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Cobros</h1>
          <p>Gracia de 5 días después del vencimiento; al día 6 las placas se pausan solas.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <section className="panel" id="por-confirmar">
        <div className="panel-head">
          <h2>Pagos por confirmar {claims.length > 0 && <span className="badge num">{claims.length}</span>}</h2>
          <span className="muted">Lo que tus clientes avisan desde su app. Nada se registra hasta que confirmes que el dinero llegó.</span>
        </div>
        {claims.length === 0 ? (
          <div className="empty"><p>No hay avisos de pago pendientes.</p></div>
        ) : (
          <ul className="claim-list">
            {claims.map((c) => (
              <li key={c.id} className="claim">
                <div className="claim-main">
                  <b>{c.business?.name ?? "Negocio"}</b>
                  <span className="num claim-amount">{usd(Number(c.amount))}</span>
                  <small className="muted">{CLAIM_METHOD[c.method]}{c.reference ? ` · ref. ${c.reference}` : ""} · avisó {dateTime(c.created_at)}{c.due_on ? ` · vencía ${human(c.due_on)}` : ""}</small>
                </div>
                <form action={decideClaim} className="claim-ok">
                  <input type="hidden" name="claim_id" value={c.id} />
                  <label className="check"><input type="checkbox" name="confirm" value="1" required /><span>El dinero ya llegó</span></label>
                  <SubmitButton className="btn btn-dark btn-sm" pending="Confirmando…">Confirmar y emitir recibo</SubmitButton>
                </form>
                <details className="claim-no">
                  <summary>No llegó</summary>
                  <form action={decideClaim} className="row">
                    <input type="hidden" name="claim_id" value={c.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input className="input" name="reason" required minLength={3} maxLength={300} placeholder="Ej. No vemos el Yappy; revisa el número" />
                    <SubmitButton className="btn btn-ghost btn-sm" pending="…">Rechazar aviso</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="kpis">
        <div className="kpi"><span>Pendiente de cobro</span><b className="num">{usd(sum(unpaid))}</b><small className="muted">{unpaid.length} moroso{unpaid.length === 1 ? "" : "s"}</small></div>
        <div className="kpi"><span>Suspendidos</span><b className="num">{owed(["suspended"]).length}</b></div>
        <div className="kpi"><span>Vencidos en gracia</span><b className="num">{owed(["late"]).length}</b></div>
        <div className="kpi"><span>Por vencer · 3 días</span><b className="num">{usd(sum(owed(["soon"])))}</b></div>
      </div>

      {ORDER.map((kind) => {
        const list = owed([kind]).sort((a, z) => (a.billing.charge?.due ?? "").localeCompare(z.billing.charge?.due ?? ""));
        if (!list.length) return null;
        return (
          <section className="panel" key={kind}>
            <div className="panel-head">
              <h2><span className={`pill bill-${kind}`}>{BILLING_LABEL[kind]}</span> {list.length}</h2>
              <span className="muted">{HINT[kind]}</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Negocio</th>
                    <th>Plan</th>
                    <th>Vence</th>
                    <th className="right">Monto</th>
                    <th>{kind === "late" ? "Se pausa" : kind === "suspended" ? "Pausado desde" : ""}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ business: b, billing, plaques }) => {
                    const c = billing.charge;
                    const phone = b.billing_phone || b.manager_phone;
                    const text = `Hola, te escribe FiveTap. ${kind === "suspended" ? `Las placas de ${b.name} están pausadas por tu pago pendiente` : `Tu pago de ${b.name}`} de ${usd(c?.amount ?? 0)} ${c ? `(vence${c.due < today ? "ió" : ""} el ${human(c.due)})` : ""}. Puedes pagar por Yappy o transferencia aquí: ${SITE_URL}/pagar?n=${encodeURIComponent(b.name)} ¡Gracias! 🙏`;
                    return (
                      <tr key={b.id}>
                        <td><Link href={`/admin/b/${b.id}`}><b>{b.name}</b></Link></td>
                        <td className="muted">{planLabel(b, c, plaques, plans)}</td>
                        <td>{c ? `${human(c.due)}${billing.daysLate > 0 ? ` · ${billing.daysLate} d de atraso` : ""}` : "—"}</td>
                        <td className="right num"><b>{c ? usd(c.amount) : "—"}</b></td>
                        <td>{billing.suspendsOn && (kind === "late" || kind === "suspended") ? human(billing.suspendsOn) : ""}</td>
                        <td>
                          <div className="row" style={{ justifyContent: "flex-end" }}>
                            {phone && kind !== "ok" && <a className="btn btn-ghost btn-sm" href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}>WhatsApp</a>}
                            {(kind === "late" || kind === "suspended") && (
                              <form action={extendGrace}>
                                <input type="hidden" name="business_id" value={b.id} />
                                <input type="hidden" name="days" value="7" />
                                <input type="hidden" name="back" value="/admin/cobros" />
                                <SubmitButton className="btn btn-ghost btn-sm" pending="Guardando…">Dar 7 días más</SubmitButton>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {!rows.some((r) => r.billing.charge) && <div className="panel"><div className="empty"><p>Todavía no hay clientes con plan. Aquí verás quién está al día, por vencer, vencido o suspendido.</p></div></div>}
    </main>
  );
}
