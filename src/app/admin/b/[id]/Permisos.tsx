import { SubmitButton } from "@/components/SubmitButton";
import { accessOf, asEntitlements, entitlementLog } from "@/lib/entitlements";
import { FEATURES, LIMIT_LABEL, TIERS, TIER_LIMITS, suggestTier, type Limits } from "@/lib/features";
import { db } from "@/lib/supabase";
import type { Business } from "@/lib/types";
import { manageBusinessLogin, saveBusinessAccess } from "../../actions";
import { dateTime } from "../../format";

/** Founder: what this business contracted (tier, exceptions, trials, limits), its history, and empresa login. */
export async function Permisos({ b }: { b: Business }) {
  const [acc, log, users] = await Promise.all([
    accessOf(b),
    entitlementLog(b.id, 10),
    db().from("business_users").select("id, role, username, last_login_at, locked_until").eq("business_id", b.id).order("created_at").then((r) => (r.data ?? []) as { id: string; role: string; username: string; last_login_at: string | null; locked_until: string | null }[]),
  ]);
  const e = asEntitlements(b.entitlements);
  const suggested = suggestTier(b.plan_key, Number(b.monthly_fee));
  const tierName = (t: string | null) => TIERS.find((x) => x.key === t)?.name ?? "Sin nivel (todo activo)";
  return (
    <>
      <section className="panel" id="permisos">
        <div className="panel-head">
          <h2>Contratación y permisos</h2>
          <span className={`pill ${acc.legacy ? "" : "bill-ok"}`}>{tierName(acc.tier)}</span>
        </div>
        <form action={saveBusinessAccess} className="form-section perm-form">
          <input type="hidden" name="business_id" value={b.id} />
          <div className="grid-2">
            <label className="field">
              <span>Nivel de la contratación</span>
              <select className="select" name="tier" defaultValue={b.tier ?? ""}>
                <option value="">Sin nivel: todo activo (como antes de los niveles)</option>
                {TIERS.map((t) => <option key={t.key} value={t.key}>{t.name}{t.key === suggested ? " · sugerido por lo contratado" : ""} — {t.hint}</option>)}
              </select>
            </label>
            <label className="field"><span>Condiciones especiales de la cotización (opcional)</span><input className="input" name="note" maxLength={300} defaultValue={e.note ?? ""} placeholder="Ej. Incluye reservas sin costo los primeros 3 meses" /></label>
          </div>
          <div className="perm-grid" role="table" aria-label="Funciones">
            {FEATURES.map((f) => {
              const v = typeof e.on?.[f.key] === "boolean" ? (e.on[f.key] ? "on" : "off") : "";
              return (
                <div key={f.key} className={`perm-row${acc.has[f.key] ? " on" : ""}`} role="row">
                  <span className="perm-name" role="cell"><b>{f.name}</b><small className="muted">{f.tiers.length ? `Incluida en ${f.tiers.map((t) => TIERS.find((x) => x.key === t)!.name).join(" y ")}` : "Nueva: no incluida en ningún nivel"}{acc.trial[f.key] ? ` · prueba hasta ${acc.trial[f.key]}` : ""}</small></span>
                  <span className={`perm-state${acc.has[f.key] ? " on" : ""}`} role="cell">{acc.has[f.key] ? "Activa" : "No incluida"}</span>
                  <select className="select" name={`f_${f.key}`} defaultValue={v} aria-label={`${f.name}: excepción`} role="cell">
                    <option value="">Según el nivel</option>
                    <option value="on">Activar (cotización)</option>
                    <option value="off">Desactivar</option>
                  </select>
                  <input className="input" type="date" name={`t_${f.key}`} defaultValue={e.trials?.[f.key] ?? ""} aria-label={`${f.name}: prueba hasta`} title="Prueba temporal hasta" role="cell" />
                </div>
              );
            })}
          </div>
          <details className="perm-limits">
            <summary>Límites {acc.tier ? `(base de ${tierName(acc.tier)})` : ""}</summary>
            <div className="grid-2">
              {(Object.keys(LIMIT_LABEL) as (keyof Limits)[]).map((k) => (
                <label key={k} className="field"><span>{LIMIT_LABEL[k]}</span><input className="input" type="number" min={0} name={`l_${k}`} defaultValue={e.limits?.[k] ?? ""} placeholder={`Del nivel: ${TIER_LIMITS[acc.tier ?? "empresarial"][k]}`} /></label>
              ))}
            </div>
          </details>
          <label className="field"><span>Motivo del cambio (queda en el historial)</span><input className="input" name="reason" maxLength={300} placeholder="Ej. Amplió a Profesional, pago confirmado el 16 nov" /></label>
          <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar contratación y permisos</SubmitButton>
          <small className="muted">“Según el nivel” aplica lo que incluye su nivel. Una prueba con fecha activa la función hasta ese día; al vencer, el negocio la ve como ampliación y no pierde lo que creó. Nada se borra al reducir funciones.</small>
        </form>
        {log.length > 0 && (
          <details className="perm-log">
            <summary>Historial de cambios ({log.length})</summary>
            <ul>
              {log.map((l) => (
                <li key={l.id}><b>{dateTime(l.created_at)}</b> · {tierName(l.changes.from.tier)} → {tierName(l.changes.to.tier)}{l.reason ? ` · ${l.reason}` : ""}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="panel" id="acceso-empresa">
        <div className="panel-head">
          <h2>Acceso con usuario y contraseña</h2>
          <span className={`pill ${b.password_required ? "bill-ok" : ""}`}>{b.password_required ? "Obligatorio" : "Con código (normal)"}</span>
        </div>
        <div className="form-section">
          {!acc.has.password_login && <p className="alert alert-warn">No está incluido en su contratación. Actívalo arriba (Empresarial o como excepción) para usarlo.</p>}
          {users.length > 0 && (
            <ul className="perm-users">
              {users.map((u) => (
                <li key={u.id}>
                  <span><b>{u.username}</b><small className="muted">{u.role === "owner" ? "Dueño/a" : "Gerente"} · {u.last_login_at ? `último ingreso ${dateTime(u.last_login_at)}` : "aún no entra"}{u.locked_until && Date.parse(u.locked_until) > Date.now() ? " · bloqueado 15 min" : ""}</small></span>
                  <form action={manageBusinessLogin}>
                    <input type="hidden" name="business_id" value={b.id} /><input type="hidden" name="op" value="remove" /><input type="hidden" name="user_id" value={u.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" pending="…">Quitar</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {acc.has.password_login && (
            <form action={manageBusinessLogin} className="grid-2 perm-newuser">
              <input type="hidden" name="business_id" value={b.id} /><input type="hidden" name="op" value="user" />
              <label className="field"><span>Usuario</span><input className="input" name="username" required pattern="[a-z0-9._\-]{3,40}" maxLength={40} placeholder="ej. maria.lopez" autoComplete="off" /></label>
              <label className="field"><span>Contraseña (mín. 10, letras y números)</span><input className="input" name="password" type="text" required minLength={10} maxLength={200} autoComplete="new-password" /></label>
              <label className="field"><span>Rol</span><select className="select" name="role" defaultValue={users.some((u) => u.role === "owner") ? "manager" : "owner"}><option value="owner">Dueño/a</option><option value="manager">Gerente</option></select></label>
              <div className="field"><span>&nbsp;</span><SubmitButton className="btn btn-dark" pending="Guardando…">Crear o restablecer</SubmitButton></div>
              <small className="muted" style={{ gridColumn: "1 / -1" }}>Se guarda cifrada: después nadie puede verla, ni tú. Si el usuario ya existe en este negocio, se le cambia la contraseña. Envíasela en privado.</small>
            </form>
          )}
          <div className="row">
            {acc.has.password_login && (
              <form action={manageBusinessLogin}>
                <input type="hidden" name="business_id" value={b.id} /><input type="hidden" name="op" value={b.password_required ? "release" : "require"} />
                <SubmitButton className={`btn btn-sm ${b.password_required ? "btn-ghost" : "btn-dark"}`} pending="…">{b.password_required ? "Volver al acceso con código" : "Exigir usuario y contraseña"}</SubmitButton>
              </form>
            )}
            {b.password_required && (
              <form action={manageBusinessLogin}>
                <input type="hidden" name="business_id" value={b.id} /><input type="hidden" name="op" value="logout" />
                <SubmitButton className="btn btn-ghost btn-sm" pending="…">Cerrar todas las sesiones</SubmitButton>
              </form>
            )}
          </div>
          <small className="muted">Al exigirlo, el enlace y el código de 6 dígitos dejan de abrir la app de este negocio: cada persona entra con su usuario y contraseña. 5 intentos fallidos bloquean ese usuario 15 minutos.</small>
        </div>
      </section>
    </>
  );
}
