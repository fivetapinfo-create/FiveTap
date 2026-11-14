import { SubmitButton } from "@/components/SubmitButton";
import { TEAM_PERIODS, type TeamPeriod, type TeamRow } from "@/lib/team";

type Props = {
  rows: TeamRow[];
  period: TeamPeriod;
  /** URL of this page without the period, e.g. "/admin/b/123" or "/mi/abc". */
  base: string;
  /** Lets the viewer write who carries each card. */
  edit?: { action: (f: FormData) => Promise<void>; hidden: Record<string, string>; cardLabel?: boolean };
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const day = (iso: string) => new Date(iso).toLocaleDateString("es-PA", { timeZone: "America/Panama", day: "numeric", month: "short" });

/**
 * Who on the team brings more guests: taps on each waiter's card, guests who went on to
 * Google from it, private messages and their stars. Same view in the owner's app and in
 * the founder's panel; it refreshes by itself while open.
 */
export function TeamRanking({ rows, period, base, edit }: Props) {
  const scans = rows.reduce((n, r) => n + r.scans, 0);
  const google = rows.reduce((n, r) => n + r.google, 0);
  const sep = base.includes("?") ? "&" : "?";
  return (
    <section className="panel" id="equipo">
      <div className="panel-head">
        <h2>Ranking del equipo</h2>
        <nav className="team-periods" aria-label="Período">
          {TEAM_PERIODS.map((p) => (
            <a key={p.key} href={`${base}${sep}equipo=${p.key}#equipo`} aria-current={p.key === period ? "page" : undefined}>{p.label}</a>
          ))}
        </nav>
      </div>
      <div className="team-sum">
        <span><b className="num">{scans}</b> toques</span>
        <span><b className="num">{google}</b> fueron a Google</span>
        <span><b className="num">{pct(google, scans)}</b> de los toques</span>
      </div>
      <ol className="team team-board">
        {rows.map((r, i) => (
          <li key={r.id}>
            <span className={`team-rank num${(r.google > 0 || r.scans > 0) && i < 3 ? " top" : ""}`} aria-label={`Puesto ${i + 1}`}>{i + 1}</span>
            <span className="team-who">
              <b>{r.name}</b>
              <small>
                {r.assigned ? r.card : "Sin nombre asignado"}
                {r.since ? ` · desde el ${day(r.since)}` : ""}
                {r.stars != null ? ` · ★ ${r.stars.toFixed(1)} (${r.rated})` : ""}
                {r.messages ? ` · ${r.messages} ${r.messages === 1 ? "mensaje" : "mensajes"}` : ""}
              </small>
            </span>
            <span className="team-num num">{r.google} <small>a Google</small></span>
            <span className="team-num num muted">{r.scans} <small>toques</small></span>
          </li>
        ))}
      </ol>
      <p className="team-note muted">
        Cuenta cada toque a la tarjeta y cada cliente que abrió Google desde ella. Google no informa qué reseña vino de qué tarjeta: “a Google” es quien fue a dejarla.
      </p>
      {edit && (
        <details className="more team-edit">
          <summary>Asignar nombres a las tarjetas</summary>
          <div className="team-edit-list">
            {rows.map((r) => (
              <form key={r.id} action={edit.action} className="team-edit-row">
                {Object.entries(edit.hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <input type="hidden" name="tag_id" value={r.id} />
                <label className="field">
                  <span>Nombre del mesero</span>
                  <input className="input" name="staff_name" defaultValue={r.assigned ? r.name : ""} maxLength={60} placeholder="Ej. Ana Pérez" />
                </label>
                {edit.cardLabel ? (
                  <label className="field">
                    <span>Tarjeta</span>
                    <input className="input" name="label" defaultValue={r.card} maxLength={40} required />
                  </label>
                ) : (
                  <span className="field"><span>Tarjeta</span><b className="team-card">{r.card}</b></span>
                )}
                {r.assigned && (
                  <label className="check"><input type="checkbox" name="new_person" value="1" /> <span>Ahora la usa otra persona (su conteo empieza hoy)</span></label>
                )}
                <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">Guardar</SubmitButton>
              </form>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
