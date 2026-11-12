import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { getPlans } from "@/lib/plans";
import { db } from "@/lib/supabase";
import { createBusiness } from "../actions";
import { placesReady } from "@/lib/places";
import { BaselineFields, EssentialFields, OptionFields } from "../BusinessFields";
import { Flash } from "../Flash";

type Props = { searchParams: Promise<{ error?: string; signup?: string }> };

export default async function NewBusiness({ searchParams }: Props) {
  const { error, signup: signupId } = await searchParams;
  // Prefilled from a self sign-up on /empezar.
  const signup = signupId && /^[0-9a-f-]{36}$/i.test(signupId)
    ? ((await db().from("signups").select("id, venue_name, owner_name, phone, plan").eq("id", signupId).maybeSingle()).data as { id: string; venue_name: string; owner_name: string; phone: string; plan: string } | null)
    : null;
  const prefill = signup ? { name: signup.venue_name, manager_name: signup.owner_name, manager_phone: signup.phone, billing_name: signup.owner_name, billing_phone: signup.phone } : undefined;
  // The plan chosen on /empezar sets the price and, for plaques, how many to create.
  const plans = await getPlans();
  const chosen = signup ? plans.find((p) => p.key === signup.plan) ?? null : null;
  return (
    <main className="container admin-main" style={{ maxWidth: 680 }}>
      <div>
        <Link className="crumb" href="/admin">← Negocios</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>Nuevo negocio</h1>
            <p>Nombre, Google, contactos y el “antes”. Las placas NFC se crean solas.</p>
          </div>
        </div>
      </div>
      <Flash error={error} />
      {signup && <p className="alert alert-ok">Datos de {signup.venue_name}, que se registró solo desde la web{chosen ? ` con el plan ${chosen.name} ($${chosen.monthly} al mes)` : ""}. Solo falta el enlace de Google.</p>}
      <form action={createBusiness} className="panel">
        {signup && <input type="hidden" name="signup_id" value={signup.id} />}
        <EssentialFields prefill={prefill} />
        <BaselineFields auto={placesReady()} />
        <details className="more">
          <summary>Más opciones (plan, precio, cantidad de placas y tarjetas, color)</summary>
          <OptionFields plans={plans} planKey={chosen?.key ?? "start"} />
          <div className="form-section">
            <div className="grid-2">
              <label className="field">
                <span>Placas de mesa</span>
                <input className="input" type="number" name="spots" min={0} max={80} placeholder="Las del plan" />
                <small>Vacío: las del plan elegido.</small>
              </label>
              <label className="field">
                <span>Tarjetas de meseros</span>
                <input className="input" type="number" name="cards" min={0} max={40} placeholder="Las del plan" />
                <small>Vacío: las del plan elegido.</small>
              </label>
              <label className="field">
                <span>Nombre de cada placa</span>
                <input className="input" name="spot_label" placeholder="Mesa, Barra, Caja…" />
                <small>Se numeran solas: Mesa 1, Mesa 2… y Mesero 1, Mesero 2…</small>
              </label>
            </div>
          </div>
        </details>
        <div className="form-section">
          <SubmitButton className="btn btn-dark btn-block" pending="Creando…">Crear negocio y placas</SubmitButton>
        </div>
      </form>
    </main>
  );
}
