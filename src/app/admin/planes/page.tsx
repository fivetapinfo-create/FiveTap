import { SubmitButton } from "@/components/SubmitButton";
import { getPlans } from "@/lib/plans";
import { db } from "@/lib/supabase";
import { updatePlan } from "../actions";
import { Flash } from "../Flash";
import { usd } from "../format";

export const dynamic = "force-dynamic";

/** The three commercial plans: price, pieces, what each includes and its PayPal plan. */
export default async function Plans({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [plans, sp, biz] = await Promise.all([getPlans(), searchParams, db().from("businesses").select("plan_key, status")]);
  const using = (key: string) => ((biz.data ?? []) as { plan_key: string | null; status: string }[]).filter((b) => b.plan_key === key && b.status !== "canceled").length;

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Planes</h1>
          <p>Precios de lanzamiento. Lo que cambies aquí se ve al instante en la web, /empezar y /pagar. Los clientes actuales conservan su precio.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
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
              <label className="field">
                <span>ID del plan en PayPal (cobro automático)</span>
                <input className="input" name="paypal_plan" defaultValue={p.paypal_plan ?? ""} placeholder="P-…" />
                <small>{p.paypal_plan ? "Si cambias el precio aquí, cámbialo también en PayPal o crea un plan nuevo y pega su ID." : "Sin ID: en /empezar este plan se pide por WhatsApp y se paga por Yappy o transferencia."}</small>
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
