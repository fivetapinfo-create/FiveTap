import { PasskeyAdd } from "@/components/PasskeyButtons";
import { SubmitButton } from "@/components/SubmitButton";
import { listPasskeys, passkeyOnly, relyingParty } from "@/lib/passkeys";
import { managePasskeys } from "../actions";
import { Flash } from "../Flash";
import { dateTime } from "../format";

export const dynamic = "force-dynamic";

/** Founder security: passkeys (Face ID / fingerprint) and "passkey only" sign-in. */
export default async function Security({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [sp, { rpID }, only] = await Promise.all([searchParams, relyingParty(), passkeyOnly()]);
  const keys = await listPasskeys();
  const here = keys.filter((k) => k.rp_id === rpID);
  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Seguridad</h1>
          <p>Entra a tu panel con Face ID, Touch ID o tu huella. Solo tus dispositivos registrados pueden abrirlo.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <section className="panel">
        <div className="panel-head"><h2>Llaves de acceso</h2><span className="muted">{here.length} en {rpID}</span></div>
        <div className="form-section">
          {here.length > 0 && (
            <ul className="perm-users">
              {here.map((k) => (
                <li key={k.id}>
                  <span><b>{k.device_name ?? "Dispositivo"}</b><small className="muted">Agregada {dateTime(k.created_at)} · {k.last_used_at ? `último ingreso ${dateTime(k.last_used_at)}` : "aún sin usar"}</small></span>
                  <form action={managePasskeys}>
                    <input type="hidden" name="op" value="remove" /><input type="hidden" name="id" value={k.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" pending="…">Quitar</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <PasskeyAdd />
          <small className="muted">La llave privada se queda en tu dispositivo; FiveTap solo guarda la parte pública. Si cambias de dominio (por ejemplo a getfivetap.com), vuelve a agregar tus dispositivos allí.</small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Solo llave de acceso</h2><span className={`pill ${only ? "bill-ok" : ""}`}>{only ? "Activado" : "Desactivado"}</span></div>
        <div className="form-section">
          <p>Al activarlo, tu contraseña normal deja de abrir el panel: solo entras con Face ID o huella. La contraseña de respaldo queda únicamente para emergencias (si pierdes tus dispositivos); guárdala en un lugar seguro.</p>
          <form action={managePasskeys} className="row">
            <input type="hidden" name="op" value={only ? "allow-password" : "passkey-only"} />
            {!only && <label className="check"><input type="checkbox" name="confirm" value="1" required /><span>Probé entrar con Face ID y funciona</span></label>}
            <SubmitButton className={`btn btn-sm ${only ? "btn-ghost" : "btn-dark"}`} pending="…">{only ? "Volver a permitir la contraseña" : "Activar solo llave de acceso"}</SubmitButton>
          </form>
          {!here.length && <small className="muted">Primero agrega al menos un dispositivo.</small>}
        </div>
      </section>
    </main>
  );
}
