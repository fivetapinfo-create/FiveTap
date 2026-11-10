import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/supabase";
import { createBusiness } from "../actions";
import { EssentialFields, OptionFields } from "../BusinessFields";
import { Flash } from "../Flash";

type Props = { searchParams: Promise<{ error?: string; signup?: string }> };

export default async function NewBusiness({ searchParams }: Props) {
  const { error, signup: signupId } = await searchParams;
  // Prefilled from a self sign-up on /prueba.
  const signup = signupId && /^[0-9a-f-]{36}$/i.test(signupId)
    ? ((await db().from("signups").select("id, venue_name, owner_name, phone").eq("id", signupId).maybeSingle()).data as { id: string; venue_name: string; owner_name: string; phone: string } | null)
    : null;
  const prefill = signup ? { name: signup.venue_name, manager_name: signup.owner_name, manager_phone: signup.phone, billing_name: signup.owner_name, billing_phone: signup.phone } : undefined;
  return (
    <main className="container admin-main" style={{ maxWidth: 680 }}>
      <div>
        <Link className="crumb" href="/admin">← Negocios</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>Nuevo negocio</h1>
            <p>Cuatro datos. Las placas NFC se crean solas.</p>
          </div>
        </div>
      </div>
      <Flash error={error} />
      {signup && <p className="alert alert-ok">Datos de {signup.venue_name}, que se registró solo desde la prueba gratis. Solo falta el enlace de Google.</p>}
      <form action={createBusiness} className="panel">
        {signup && <input type="hidden" name="signup_id" value={signup.id} />}
        <EssentialFields prefill={prefill} />
        <details className="more">
          <summary>Más opciones (tipo, color, cantidad de placas, precio)</summary>
          <OptionFields />
          <div className="form-section">
            <div className="grid-2">
              <label className="field">
                <span>Cantidad de placas</span>
                <input className="input" type="number" name="spots" min={1} max={80} defaultValue={10} />
              </label>
              <label className="field">
                <span>Nombre de cada placa</span>
                <input className="input" name="spot_label" placeholder="Mesa, Barra, Caja…" />
                <small>Se numeran solas: Mesa 1, Mesa 2…</small>
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
