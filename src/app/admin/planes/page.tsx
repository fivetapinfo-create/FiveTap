import { LOYALTY } from "@/lib/loyalty";
import { SubmitButton } from "@/components/SubmitButton";
import { getPlans } from "@/lib/plans";
import { db } from "@/lib/supabase";
import { saveRollout, updatePlan } from "../actions";
import { FEATURES, TIERS } from "@/lib/features";
import { rollout } from "@/lib/entitlements";
import { Flash } from "../Flash";
import { usd } from "../format";
import { ONE_TIME } from "@/lib/test-kit";

export const dynamic = "force-dynamic";

/** The monthly reference plans (5 pieces or more): price, pieces and what each includes. */
export default async function Plans({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [plans, sp, biz, ro, tierRows] = await Promise.all([getPlans(), searchParams, db().from("businesses").select("plan_key, status"), rollout(), db().from("businesses").select("tier").neq("status", "canceled")]);
  const tierCount = (t: string | null) => ((tierRows.data ?? []) as { tier: string | null }[]).filter((x) => x.tier === t).length;
  const using = (key: string) => ((biz.data ?? []) as { plan_key: string | null; status: string }[]).filter((b) => b.plan_key === key && b.status !== "canceled").length;

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Planes</h1>
          <p>Planes mensuales de referencia. Lo que cambies aquí se ve en la web y en /empezar en unos minutos. Los clientes actuales conservan su precio.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      <section className="panel plan-rules">
        <div className="panel-head"><h2>Cómo se vende FiveTap</h2></div>
        <ol className="form-section">
          <li><b>De 1 a {ONE_TIME.max} piezas: pago único.</b> Placa {usd(ONE_TIME.plaque)}, tarjeta {usd(ONE_TIME.card)}, {ONE_TIME.packs.map((k) => `${k.name} ${k.qty} por ${usd(k.price)}`).join(", ")}. Van directo a Google, sin app ni mensualidad.</li>
          <li><b>Desde {ONE_TIME.max + 1} piezas: plan mensual.</b> Estos planes son la referencia que ve el cliente en la web; al registrar el negocio eliges uno o “Plan a la medida”. Una sola placa con FiveTap Business (por ejemplo, el mostrador de un restaurante) también puede ir en plan mensual a la medida.</li>
          <li><b>Cada cliente se cotiza contigo.</b> Evalúas sus piezas NFC y lo que le sirve, y le armas la mensualidad que le salga beneficiosa. Se escribe en su ficha y se cobra en Cobros. No hay cobro automático: un día antes del vencimiento, al dueño le llega el aviso y renueva desde su app por efectivo, Yappy o transferencia, y te envía el comprobante.</li>
          <li><b>Premio de lealtad.</b> Al cumplir {LOYALTY.afterMonths} mensualidades pagadas, las siguientes {LOYALTY.months} llevan {LOYALTY.pct}% menos (por ejemplo, $140 → {usd(140 * (1 - LOYALTY.pct / 100))}), y se repite cada año que sigue contigo. Se aplica solo en su renovación, en Cobros y en sus avisos; el dueño ve su avance en la tarjeta de socio de su app. Te cuesta {LOYALTY.pct * LOYALTY.months / 12}% del año de ese cliente.</li>
        </ol>
      </section>
      <section className="panel" id="funciones">
        <div className="panel-head">
          <h2>Funciones por nivel</h2>
          <span className="muted">{TIERS.map((t) => `${t.name}: ${tierCount(t.key)}`).join(" · ")} · Sin nivel: {tierCount(null)} negocios</span>
        </div>
        <form action={saveRollout} className="form-section">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Función</th>{TIERS.map((t) => <th key={t.key}>{t.name}</th>)}<th>De pago</th><th>Nota</th></tr></thead>
              <tbody>
                {FEATURES.map((f) => {
                  const r = ro.find((x) => x.key === f.key);
                  const tiers = r?.tiers ?? f.tiers;
                  return (
                    <tr key={f.key}>
                      <td><b>{f.name}</b><br /><small className="muted">{f.what}</small></td>
                      {TIERS.map((t) => <td key={t.key}><input type="checkbox" name={`r_${f.key}_${t.key}`} value="1" defaultChecked={tiers.includes(t.key)} aria-label={`${f.name} en ${t.name}`} /></td>)}
                      <td><input type="checkbox" name={`p_${f.key}`} value="1" defaultChecked={r?.paid ?? false} aria-label={`${f.name} es de pago`} /></td>
                      <td><input className="input" name={`n_${f.key}`} maxLength={200} defaultValue={r?.note ?? ""} placeholder="Opcional" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar funciones por nivel</SubmitButton>
          <small className="muted">Una función nueva se agrega sin niveles marcados: no le llega a nadie hasta que la marques aquí o la actives a un negocio en su ficha. Los negocios sin nivel (los que existían antes) conservan todo.</small>
        </form>
      </section>

      <div className="plan-admin">
        {plans.map((p) => (
          <form key={p.key} id={p.key} action={updatePlan} className="panel plan-edit">
            <input type="hidden" name="key" value={p.key} />
            <div className="panel-head">
              <h2>{p.name}</h2>
              <span className="muted">{usd(p.monthly)}/mes · {using(p.key)} {using(p.key) === 1 ? "cliente" : "clientes"}</span>
            </div>
            <div className="form-section">
              <div className="grid-2">
                <label className="field"><span>Nombre</span><input className="input" name="name" defaultValue={p.name} maxLength={40} required /></label>
                <label className="field"><span>Precio mensual (USD)</span><input className="input" type="number" name="monthly" min={0} step="0.01" defaultValue={p.monthly} required /></label>
                <label className="field"><span>Placas NFC para mesas</span><input className="input" type="number" name="plaques" min={0} max={200} defaultValue={p.plaques} /></label>
                <label className="field"><span>Tarjetas NFC para meseros</span><input className="input" type="number" name="cards" min={0} max={100} defaultValue={p.cards} /></label>
                <label className="field"><span>Cordones porta tarjetas</span><input className="input" type="number" name="lanyards" min={0} max={100} defaultValue={p.lanyards} /></label>
                <label className="field"><span>Etiqueta (opcional)</span><input className="input" name="badge" defaultValue={p.badge ?? ""} maxLength={30} placeholder="Más popular" /></label>
                <label className="field">
                  <span>Color de la etiqueta</span>
                  <select className="select" name="badge_color" defaultValue={p.badge_color}>
                    <option value="neutral">Neutro</option>
                    <option value="blue">Azul</option>
                    <option value="purple">Morado</option>
                    <option value="gold">Dorado</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Qué incluye (una línea por punto)</span>
                <textarea className="input" name="features" rows={6} defaultValue={p.features.join("\n")} />
                <small>Las placas, tarjetas y cordones se muestran solos arriba de esta lista. Escribe solo lo que FiveTap ya hace o tú ya ofreces.</small>
              </label>
              <label className="check"><input type="checkbox" name="active" value="1" defaultChecked={p.active} /><span>Visible en la web</span></label>
              <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar {p.name}</SubmitButton>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}
