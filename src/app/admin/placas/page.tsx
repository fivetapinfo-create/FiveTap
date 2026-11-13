import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { KIND_NAME, PIECE_LABEL, nextStep, pieceState, type PieceState } from "@/lib/pieces";
import { nfcUrl } from "@/lib/site";
import { db } from "@/lib/supabase";
import type { Tag } from "@/lib/types";
import { saveTagInfo, setTagStatus } from "../actions";
import { Flash } from "../Flash";
import { ago } from "../format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; b?: string; estado?: string; tipo?: string; ok?: string; error?: string }> };
type Row = Tag & { business: { id: string; name: string } | null };
type Log = { entity_id: string; at: string; action: string; details: Record<string, string> };

const FILTERS: { key: string; label: string; match: (s: PieceState) => boolean }[] = [
  { key: "activas", label: "En uso", match: (s) => s === "sin-grabar" || s === "grabada" || s === "entregada" },
  { key: "sin-grabar", label: "Sin grabar", match: (s) => s === "sin-grabar" },
  { key: "grabada", label: "Grabadas", match: (s) => s === "grabada" },
  { key: "entregada", label: "Entregadas", match: (s) => s === "entregada" },
  { key: "retirada", label: "Retiradas", match: (s) => s === "retirada" },
  { key: "todas", label: "Todas", match: () => true },
];

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-PA", { timeZone: "America/Panama", day: "numeric", month: "short", year: "numeric" }) : null);
const said = (l: Log) =>
  l.action === "tag.status" ? `Pasó a ${PIECE_LABEL[l.details.to === "written" ? "grabada" : l.details.to === "delivered" ? "entregada" : "retirada"]}`
  : l.action === "tag.renamed" ? `Nombre: “${l.details.from}” → “${l.details.to}”`
  : l.action === "tag.note" ? "Nota actualizada"
  : l.action === "tag.activated" ? "Activada" : l.action === "tag.deactivated" ? "Desactivada" : l.action;

/**
 * Every NFC plaque and card, grouped by client: what it is called, where it is, what is
 * written on the chip and what to do next. Names and notes are the founder's; the link
 * on the chip never changes.
 */
export default async function Pieces({ searchParams }: Props) {
  const sp = await searchParams;
  const [tagRes, statRes, lastRes, logRes] = await Promise.all([
    db().from("tags").select("*, business:businesses(id, name)").order("created_at"),
    db().from("tag_stats").select("tag_id, scans_30d"),
    db().from("tag_last_tap").select("tag_id, last_at"),
    db().from("audit_log").select("entity_id, at, action, details").eq("entity", "tag").order("at", { ascending: false }).limit(3000),
  ]);
  const all = (tagRes.data ?? []) as Row[];
  const scans = new Map(((statRes.data ?? []) as { tag_id: string; scans_30d: number }[]).map((r) => [r.tag_id, Number(r.scans_30d)]));
  const last = new Map(((lastRes.data ?? []) as { tag_id: string; last_at: string }[]).map((r) => [r.tag_id, r.last_at]));
  const logs = new Map<string, Log[]>();
  for (const l of (logRes.data ?? []) as Log[]) logs.set(l.entity_id, [...(logs.get(l.entity_id) ?? []), l]);

  const filter = FILTERS.find((f) => f.key === sp.estado) ?? FILTERS[0]!;
  const q = (sp.q ?? "").trim().toLowerCase();
  const clients = [...new Map(all.filter((t) => t.business).map((t) => [t.business!.id, t.business!.name])).entries()].sort((a, z) => a[1].localeCompare(z[1]));
  const count = (f: (typeof FILTERS)[number]) => all.filter((t) => f.match(pieceState(t))).length;
  const shown = all.filter((t) => {
    if (!filter.match(pieceState(t))) return false;
    if (sp.b && t.business?.id !== sp.b) return false;
    if (sp.tipo && t.kind !== sp.tipo) return false;
    if (q && ![t.label, t.code, t.business?.name ?? "", t.note ?? ""].some((x) => x.toLowerCase().includes(q))) return false;
    return true;
  });
  const groups = clients.map(([id, name]) => ({ id, name, items: shown.filter((t) => t.business?.id === id) })).filter((g) => g.items.length);
  const here = `/admin/placas?${new URLSearchParams(Object.entries({ q: sp.q ?? "", b: sp.b ?? "", estado: sp.estado ?? "", tipo: sp.tipo ?? "" }).filter(([, v]) => v)).toString()}`;
  const link = (estado: string) => `/admin/placas?${new URLSearchParams(Object.entries({ q: sp.q ?? "", b: sp.b ?? "", tipo: sp.tipo ?? "", estado }).filter(([, v]) => v)).toString()}`;

  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Placas</h1>
          <p>Todas tus placas y tarjetas NFC. El nombre y las notas son solo para ti: nunca cambian lo que está grabado en el chip.</p>
        </div>
        <a className="btn btn-ghost btn-sm" href="/admin/placas/csv" download>Descargar Excel</a>
      </div>

      <Flash ok={sp.ok} error={sp.error} />

      <nav className="piece-filters" aria-label="Estado">
        {FILTERS.map((f) => (
          <Link key={f.key} href={link(f.key === "activas" ? "" : f.key)} aria-current={f.key === filter.key ? "page" : undefined}>
            {f.label} <b className="num">{count(f)}</b>
          </Link>
        ))}
      </nav>

      <form className="piece-search" action="/admin/placas">
        {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
        <input className="input" name="q" defaultValue={sp.q} placeholder="Buscar por nombre, cliente o código (ej. pqa3435)" aria-label="Buscar" />
        <select className="select" name="b" defaultValue={sp.b ?? ""} aria-label="Cliente">
          <option value="">Todos los clientes</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="select" name="tipo" defaultValue={sp.tipo ?? ""} aria-label="Tipo">
          <option value="">Placas y tarjetas</option>
          <option value="table">Solo placas</option>
          <option value="waiter">Solo tarjetas de mesero</option>
        </select>
        <button className="btn btn-dark btn-sm" type="submit">Buscar</button>
      </form>

      {groups.length === 0 && (
        <div className="panel"><div className="empty"><p>{all.length ? "Nada con ese filtro." : "Aún no hay placas. Se crean solas al crear un negocio."}</p></div></div>
      )}

      {groups.map((g) => (
        <section className="panel" key={g.id}>
          <div className="panel-head">
            <h2><Link href={`/admin/b/${g.id}#placas`}>{g.name}</Link></h2>
            <span className="muted">{g.items.length} {g.items.length === 1 ? "pieza" : "piezas"} · {g.items.filter((t) => t.status === "delivered").length} entregadas</span>
          </div>
          <ul className="inv-list">
            {g.items.map((t) => {
              const state = pieceState(t);
              const step = nextStep(state);
              const history = logs.get(t.id) ?? [];
              return (
                <li key={t.id} className="inv-item">
                  <div className="piece-main">
                    <span className={`piece-state ${state}`}>{PIECE_LABEL[state]}</span>
                    <div className="piece-name">
                      <b>{t.label}</b>
                      <small>{KIND_NAME[t.kind]} · <span className="code">{t.code}</span>{t.note ? ` · ${t.note}` : ""}</small>
                    </div>
                    <div className="piece-use">
                      <b className="num">{scans.get(t.id) ?? 0}</b>
                      <small>toques 30 d · {last.has(t.id) ? ago(last.get(t.id)) : "sin toques"}</small>
                    </div>
                    <div className="piece-actions">
                      <CopyButton value={nfcUrl(t.code)} label="Copiar enlace" />
                      {step && (
                        <form action={setTagStatus}>
                          <input type="hidden" name="tag_id" value={t.id} />
                          <input type="hidden" name="status" value={step.to} />
                          <input type="hidden" name="back" value={here} />
                          <SubmitButton className="btn btn-dark btn-sm" pending="…">{step.label}</SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                  <details className="piece-more">
                    <summary>Editar e historial</summary>
                    <div className="piece-detail">
                      <form action={saveTagInfo} className="piece-edit">
                        <input type="hidden" name="tag_id" value={t.id} />
                        <input type="hidden" name="back" value={here} />
                        <label className="field"><span>Nombre (solo para ti)</span><input className="input" name="label" defaultValue={t.label} maxLength={60} required /></label>
                        <label className="field"><span>Nota</span><input className="input" name="note" defaultValue={t.note ?? ""} maxLength={500} placeholder="Ej. pegada en la caja, color negro" /></label>
                        <SubmitButton className="btn btn-ghost btn-sm" pending="Guardando…">Guardar</SubmitButton>
                      </form>
                      <p className="muted piece-url">Grabado en el chip: <span className="code">{nfcUrl(t.code)}</span> · no cambia nunca.</p>
                      <ol className="piece-history">
                        {history.slice(0, 6).map((l, i) => <li key={i}><span>{day(l.at)}</span>{said(l)}</li>)}
                        {t.retired_at && !history.length && <li><span>{day(t.retired_at)}</span>Retirada</li>}
                        {t.delivered_at && !history.length && <li><span>{day(t.delivered_at)}</span>Entregada</li>}
                        <li><span>{day(t.created_at)}</span>Creada</li>
                      </ol>
                      {state === "entregada" && (
                        <form action={setTagStatus} className="piece-retire">
                          <input type="hidden" name="tag_id" value={t.id} />
                          <input type="hidden" name="status" value="retired" />
                          <input type="hidden" name="back" value={here} />
                          <label className="check"><input type="checkbox" name="confirm" value="1" required /> Ya la retiré del local. Entiendo que su enlace dejará de funcionar.</label>
                          <SubmitButton className="btn btn-ghost btn-sm" pending="…">Retirar pieza</SubmitButton>
                        </form>
                      )}
                      {state === "retirada" && (
                        <form action={setTagStatus}>
                          <input type="hidden" name="tag_id" value={t.id} />
                          <input type="hidden" name="status" value="delivered" />
                          <input type="hidden" name="back" value={here} />
                          <SubmitButton className="btn btn-ghost btn-sm" pending="…">Volver a entregar</SubmitButton>
                        </form>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
