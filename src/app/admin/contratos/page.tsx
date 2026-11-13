import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { AGREEMENT_METHODS, SIGNER_ROLES, longDay, money2 } from "@/lib/agreement";
import { listAgreements } from "@/lib/agreements-db";
import { todayPanama } from "@/lib/agenda";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/supabase";
import { createAgreement, deleteAgreement } from "../actions";
import { Flash } from "../Flash";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ok?: string; error?: string; b?: string; c?: string }> };
type Biz = { id: string; name: string; billing_name: string | null; manager_name: string | null; billing_phone: string | null; manager_phone: string | null; status: string };

/** 3-month contracts: create one from a business, preview, download and send it. */
export default async function Contracts({ searchParams }: Props) {
  const [sp, list, bizRes] = await Promise.all([
    searchParams,
    listAgreements(),
    db().from("businesses").select("id, name, billing_name, manager_name, billing_phone, manager_phone, status").neq("status", "canceled").order("name"),
  ]);
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
