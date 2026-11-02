import Link from "next/link";
import { listContracts } from "@/lib/company";
import { PLANS, contractTerms, longDate, money } from "@/lib/contract";

export default async function Contracts() {
  const rows = await listContracts();
  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Contratos</h1>
          <p>Contratos de servicio con tus clientes, en PDF y listos para firmar en dos copias.</p>
        </div>
        <Link className="btn btn-dark btn-sm" href="/admin/contratos/nuevo">+ Nuevo contrato</Link>
      </div>
      <section className="panel">
        {rows.length === 0 ? (
          <div className="empty">
            <p>Todavía no hay contratos.</p>
            <Link className="btn btn-dark btn-sm" href="/admin/contratos/nuevo">Generar el primero</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Número</th><th>Local</th><th>Plan</th><th>Inicio</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="code">{c.number}</td>
                    <td><Link href={`/admin/contratos/${c.id}`}><b>{c.venue_name}</b></Link><small className="muted" style={{ display: "block" }}>{c.venue_kind} · {c.sector}</small></td>
                    <td>{PLANS[c.plan].label} · {money(contractTerms(c).plan.price)}/{PLANS[c.plan].every}</td>
                    <td>{longDate(c.start_date)}</td>
                    <td><a className="btn btn-ghost btn-sm" href={`/admin/contratos/${c.id}/pdf`} target="_blank" rel="noreferrer">PDF</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
