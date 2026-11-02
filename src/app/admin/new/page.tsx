import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { createBusiness } from "../actions";
import { EssentialFields, OptionFields } from "../BusinessFields";
import { Flash } from "../Flash";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewBusiness({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <main className="container admin-main" style={{ maxWidth: 680 }}>
      <div>
        <Link className="crumb" href="/admin">← Negocios</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>Nuevo negocio</h1>
            <p>Cuatro datos. Las placas NFC y los QR se crean solos.</p>
          </div>
        </div>
      </div>
      <Flash error={error} />
      <form action={createBusiness} className="panel">
        <EssentialFields />
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
