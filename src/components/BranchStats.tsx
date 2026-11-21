import type { BranchRow } from "@/lib/branch-stats";

/** Branches side by side, last 30 days, with the whole business as the last row. */
export function BranchStats({ rows, total, title = "Sucursales · últimos 30 días" }: { rows: BranchRow[]; total: BranchRow; title?: string }) {
  const cell = (r: BranchRow, strong = false) => (
    <tr key={r.id ?? r.name} className={strong ? "bs-total" : r.active ? undefined : "bs-off"}>
      <th scope="row">{r.name}{!r.active && <small className="muted"> · desactivada</small>}</th>
      <td>{r.pieces}</td><td>{r.taps}</td><td>{r.google}</td>
      <td>{r.ratings ? `${r.avg?.toFixed(1)} ★ · ${r.ratings}` : "—"}</td><td>{r.messages}</td>
    </tr>
  );
  return (
    <section className="panel bs" id="sucursales">
      <div className="panel-head"><h2>{title}</h2></div>
      <div className="bs-scroll">
        <table className="bs-table">
          <thead><tr><th scope="col">Sucursal</th><th scope="col">Piezas</th><th scope="col">Toques</th><th scope="col">Clics a Google</th><th scope="col">Meseros</th><th scope="col">Mensajes</th></tr></thead>
          <tbody>{rows.map((r) => cell(r))}{cell(total, true)}</tbody>
        </table>
      </div>
    </section>
  );
}
