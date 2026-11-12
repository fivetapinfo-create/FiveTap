import { SubmitButton } from "@/components/SubmitButton";
import { finances, getCompany, listDocuments, listFounders } from "@/lib/company";
import { money } from "@/lib/contract";
import { Flash } from "../Flash";
import { deleteDocument, deleteFounder, saveCompany, saveFounder, uploadDocument } from "./actions";

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

const DOC_KINDS = [
  ["constitucion", "Pacto social / constitución"],
  ["certificado", "Certificado de registro"],
  ["domicilio", "Domicilio legal"],
  ["identidad", "Pasaporte / identidad"],
  ["acuerdo", "Acuerdo de fundadores firmado"],
  ["otro", "Otro"],
] as const;
const DOC_LABEL = Object.fromEntries(DOC_KINDS) as Record<string, string>;

const MONTH = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function CompanyPage({ searchParams }: Props) {
  const company = getCompany();
  const [sp, c, founders, docs, f] = await Promise.all([searchParams, company, listFounders(), listDocuments(), company.then(finances)]);
  const equity = founders.reduce((n, x) => n + Number(x.equity_pct), 0) + Number(c.option_pool_pct);
  const costs = [...c.monthly_costs, ...Array.from({ length: Math.max(0, 6 - c.monthly_costs.length) }, () => ({ name: "", amount: 0 }))].slice(0, 6);
  const maxMonth = Math.max(1, ...f.months.map((m) => m.total));

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Empresa</h1>
          <p>{c.legal_name || c.trade_name} · finanzas, fundador, participación y documentos.</p>
        </div>
      </div>

      <Flash ok={sp.ok} error={sp.error} />

      {/* ---------------- Finanzas ---------------- */}
      <div className="kpis">
        <div className="kpi"><span>Ingreso fijo mensual (MRR)</span><b className="num">{money(f.mrr)}</b><small className="muted">{f.counts.subscribers} con plan activo</small></div>
        <div className="kpi kpi-gold"><span>Neto mensual estimado</span><b className="num">{money(Math.round(f.netMonthly * 100) / 100)}</b><small className="muted">MRR − comisiones − costos fijos</small></div>
        <div className="kpi"><span>Cobrado este mes</span><b className="num">{money(f.thisMonth)}</b><small className="muted">Comisión PayPal ≈ {money(Math.round(f.thisMonthFees * 100) / 100)}</small></div>
        <div className="kpi"><span>Cobrado hasta hoy</span><b className="num">{money(f.totalToDate)}</b><small className="muted">Neto ≈ {money(Math.round((f.totalToDate - f.feesToDate) * 100) / 100)}</small></div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>De dónde viene el dinero</h2><small className="muted">Sale de los pagos que registras en cada negocio.</small></div>
        <div className="fin-grid">
          <div className="fin-list">
            {[
              ["Mensualidades", f.byKind.monthly],
              // Older kinds (installation, annual, one-time pieces) are no longer sold: counted as "Otros".
              ["Otros cobros", f.byKind.other + f.byKind.setup + f.byKind.annual + f.byKind.pieces],
            ].map(([k, v]) => (
              <div key={k as string}><span>{k}</span><b className="num">{money(v as number)}</b></div>
            ))}
            <div className="fin-sep"><span>Locales</span><b className="num">{f.counts.businesses}</b></div>
            <div><span>Con plan activo</span><b className="num">{f.counts.subscribers}</b></div>
            <div><span>En prueba (FiveTap Test)</span><b className="num">{f.counts.trial}</b></div>
            <div className="fin-sep"><span>Costos fijos al mes</span><b className="num">{money(f.fixed)}</b></div>
            <div><span>Comisiones PayPal sobre el MRR</span><b className="num">{money(Math.round(f.mrrFees * 100) / 100)}</b></div>
          </div>
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Cobrado por mes</p>
            <div className="bars" role="img" aria-label="Cobrado en los últimos 6 meses">
              {f.months.map((m) => (
                <div key={m.key} className="bar">
                  <span className="num">{m.total ? money(Math.round(m.total)) : ""}</span>
                  <i style={{ height: `${Math.max(2, (m.total / maxMonth) * 100)}%` }} />
                  <small>{MONTH[Number(m.key.slice(5, 7)) - 1]}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Fundador ---------------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>Fundadores · {founders.length}</h2>
          {founders.length > 0 && <a className="btn btn-dark btn-sm" href="/admin/empresa/acuerdo" target="_blank" rel="noreferrer">Acuerdo de fundadores (PDF)</a>}
        </div>
        {[...founders, null].map((x) => (
          <form key={x?.id ?? "new"} action={saveFounder} className="form-section">
            {x && <input type="hidden" name="id" value={x.id} />}
            <h3>{x ? `${x.first_name} ${x.last_name}` : founders.length ? "Agregar otro fundador" : "Tus datos de fundador"}</h3>
            <div className="grid-3">
              <label className="field"><span>Nombre</span><input className="input" name="first_name" required defaultValue={x?.first_name} /></label>
              <label className="field"><span>Apellido</span><input className="input" name="last_name" required defaultValue={x?.last_name} /></label>
              <label className="field"><span>Pasaporte</span><input className="input" name="passport" defaultValue={x?.passport ?? ""} autoComplete="off" /></label>
              <label className="field"><span>Nacionalidad</span><input className="input" name="nationality" defaultValue={x?.nationality ?? ""} /></label>
              <label className="field"><span>Rol</span><input className="input" name="role" defaultValue={x?.role ?? "Fundador y CEO"} /></label>
              <label className="field"><span>Participación (%)</span><input className="input num" name="equity_pct" type="number" step="0.01" min={0} max={100} defaultValue={x?.equity_pct ?? (founders.length ? 0 : 100)} /></label>
              <label className="field"><span>Fundador desde</span><input className="input" name="joined_on" type="date" defaultValue={x?.joined_on ?? ""} /></label>
            </div>
            <div className="row">
              <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">{x ? "Guardar" : "Agregar"}</SubmitButton>
              {x && founders.length > 1 && <button formAction={deleteFounder} className="btn btn-ghost btn-sm">Quitar</button>}
            </div>
          </form>
        ))}
      </section>

      {/* ---------------- Cap table ---------------- */}
      <section className="panel">
        <div className="panel-head"><h2>Cap table (participación)</h2><small className={equity === 100 ? "muted" : "alert-warn"}>Total: {equity}%{equity !== 100 ? " · debería sumar 100%" : ""}</small></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Socio</th><th>Rol</th><th className="right">%</th><th>Participación</th></tr></thead>
            <tbody>
              {founders.map((x) => (
                <tr key={x.id}>
                  <td><b>{x.first_name} {x.last_name}</b></td>
                  <td>{x.role}</td>
                  <td className="right num">{Number(x.equity_pct)}%</td>
                  <td><span className="cap-bar"><i style={{ width: `${Math.min(100, Number(x.equity_pct))}%` }} /></span></td>
                </tr>
              ))}
              {Number(c.option_pool_pct) > 0 && (
                <tr><td><b>Reserva para equipo</b></td><td className="muted">Opciones futuras</td><td className="right num">{Number(c.option_pool_pct)}%</td><td><span className="cap-bar"><i style={{ width: `${Number(c.option_pool_pct)}%` }} /></span></td></tr>
              )}
              {founders.length === 0 && <tr><td colSpan={4} className="muted">Agrega tus datos de fundador arriba.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Empresa y costos ---------------- */}
      <section className="panel">
        <div className="panel-head"><h2>Datos de la empresa y costos</h2></div>
        <form action={saveCompany}>
          <div className="form-section">
            <h3>Constitución</h3>
            <div className="grid-2">
              <label className="field"><span>Nombre comercial</span><input className="input" name="trade_name" defaultValue={c.trade_name} /></label>
              <label className="field"><span>Razón social</span><input className="input" name="legal_name" defaultValue={c.legal_name ?? ""} placeholder="FiveTap, S.A." /></label>
              <label className="field"><span>Tipo de sociedad</span><input className="input" name="entity_type" defaultValue={c.entity_type ?? ""} placeholder="Sociedad Anónima" /></label>
              <label className="field"><span>Número de registro / folio</span><input className="input" name="registry_number" defaultValue={c.registry_number ?? ""} /></label>
              <label className="field"><span>Fecha de constitución</span><input className="input" type="date" name="constitution_date" defaultValue={c.constitution_date ?? ""} /></label>
              <label className="field"><span>Reserva para equipo (%)</span><input className="input num" type="number" step="0.01" min={0} max={100} name="option_pool_pct" defaultValue={Number(c.option_pool_pct)} /></label>
            </div>
            <label className="field"><span>Domicilio legal</span><input className="input" name="legal_address" defaultValue={c.legal_address ?? ""} placeholder="Calle, edificio, oficina, corregimiento, Ciudad de Panamá" /></label>
          </div>
          <div className="form-section">
            <h3>Representante legal</h3>
            <p className="muted" style={{ fontSize: 14 }}>La persona adulta que firma en nombre de la empresa. Sale en los contratos junto a la firma del fundador.</p>
            <div className="grid-3">
              <label className="field"><span>Nombre completo</span><input className="input" name="representative_name" defaultValue={c.representative_name ?? ""} placeholder="Nombre y apellidos" /></label>
              <label className="field"><span>Cédula o pasaporte</span><input className="input" name="representative_id" defaultValue={c.representative_id ?? ""} autoComplete="off" /></label>
              <label className="field"><span>Cargo</span><input className="input" name="representative_role" defaultValue={c.representative_role || "Representante legal"} /></label>
            </div>
          </div>
          <div className="form-section">
            <h3>Costos para calcular el neto</h3>
            <div className="grid-2">
              {costs.map((x, i) => (
                <div key={i} className="row cost-row">
                  <input className="input" name={`cost_name_${i}`} defaultValue={x.name} placeholder="Costo fijo (ej. Vercel Pro)" />
                  <input className="input num" name={`cost_amount_${i}`} type="number" step="0.01" min={0} defaultValue={x.amount || ""} placeholder="$ / mes" />
                </div>
              ))}
            </div>
            <div className="grid-2">
              <label className="field"><span>Comisión PayPal (%)</span><input className="input num" type="number" step="0.01" min={0} name="paypal_fee_pct" defaultValue={Number(c.paypal_fee_pct)} /></label>
              <label className="field"><span>Comisión PayPal fija por cobro ($)</span><input className="input num" type="number" step="0.01" min={0} name="paypal_fee_fixed" defaultValue={Number(c.paypal_fee_fixed)} /></label>
              <label className="field"><span>Costo de una placa ($)</span><input className="input num" type="number" step="0.01" min={0} name="cost_plaque" defaultValue={Number(c.cost_plaque)} /></label>
              <label className="field"><span>Costo de una tarjeta de mesero ($)</span><input className="input num" type="number" step="0.01" min={0} name="cost_card" defaultValue={Number(c.cost_card)} /></label>
            </div>
            <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar</SubmitButton>
          </div>
        </form>
      </section>

      {/* ---------------- Documentos ---------------- */}
      <section className="panel">
        <div className="panel-head"><h2>Documentos · {docs.length}</h2><small className="muted">Privados: solo se ven desde este panel.</small></div>
        <form action={uploadDocument} className="form-section">
          <div className="grid-3">
            <label className="field">
              <span>Tipo</span>
              <select className="select" name="kind" defaultValue="constitucion">
                {DOC_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="field"><span>Título (opcional)</span><input className="input" name="title" placeholder="Certificado del Registro Público" /></label>
            <label className="field"><span>Archivo (PDF o foto, máx. 4 MB)</span><input className="input" type="file" name="file" accept="application/pdf,image/*" required /></label>
          </div>
          <SubmitButton className="btn btn-dark btn-sm" pending="Subiendo…">Subir documento</SubmitButton>
        </form>
        {docs.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th /></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td><a className="link-u" href={`/admin/empresa/doc/${d.id}`} target="_blank" rel="noreferrer"><b>{d.title}</b></a></td>
                    <td className="muted">{DOC_LABEL[d.kind] ?? d.kind}</td>
                    <td className="muted">{d.created_at.slice(0, 10)}</td>
                    <td>
                      <form action={deleteDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="btn btn-ghost btn-sm" type="submit">Borrar</button>
                      </form>
                    </td>
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
