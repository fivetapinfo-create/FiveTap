import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/supabase";
import { TOOLS, type ToolName } from "@/lib/ops";
import { dateTime } from "../format";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  create_business: "Registró un negocio",
  update_experience_draft: "Editó el borrador de la experiencia",
  upload_image: "Subió una imagen",
  upsert_promotion: "Guardó una promoción",
  delete_promotion: "Eliminó una promoción",
  upsert_item: "Guardó un producto",
  delete_item: "Eliminó un producto",
  set_module: "Cambió un módulo",
  add_plaques: "Agregó placas",
  publish_experience: "Publicó la experiencia",
};

type Row = { id: string; at: string; action: string; business_id: string | null; entity_id: string | null; details: Record<string, unknown> };

/** Everything Claude changed through FiveTap Ops, and how to connect it. */
export default async function ClaudeActivity() {
  const { data } = await db().from("audit_log").select("id, at, action, business_id, entity_id, details").like("action", "claude.%").order("at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  const ready = Boolean(process.env.OPS_TOKEN && process.env.OPS_TOKEN.length >= 32);
  const endpoint = `${SITE_URL}/api/ops/mcp`;
  const cmd = `claude mcp add --transport http fivetap ${endpoint} --header "Authorization: Bearer TU_OPS_TOKEN"`;
  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Actividad de Claude</h1>
          <p>Todo lo que Claude cambia en FiveTap queda aquí. Claude no puede cambiar precios ni planes de un negocio, borrar negocios ni ver pagos.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Conexión</h2><span className={`pill ${ready ? "active" : "paused"}`}>{ready ? "Activa" : "Falta OPS_TOKEN"}</span></div>
        <div className="msg">
          <p className="muted">Claude se conecta a FiveTap con una clave privada (OPS_TOKEN) guardada en Vercel → Settings → Environment Variables. Si alguna vez se filtra, cámbiala ahí y vuelve a publicar: la anterior deja de servir.</p>
          <p><b>Dirección:</b> <span className="code">{endpoint}</span> <CopyButton value={endpoint} label="Copiar" /></p>
          <p><b>En Claude Code (tu computadora):</b></p>
          <p className="code" style={{ wordBreak: "break-all" }}>{cmd}</p>
          <p className="muted" style={{ fontSize: 13 }}>Reemplaza TU_OPS_TOKEN por la clave de Vercel. Después escribe, por ejemplo: “Claude, registra un nuevo restaurante en FiveTap”.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Lo que Claude puede hacer</h2><span className="muted">{Object.keys(TOOLS).length} acciones</span></div>
        <ul className="claude-tools">
          {(Object.keys(TOOLS) as ToolName[]).map((k) => <li key={k}><b className="code">{k}</b><span className="muted">{TOOLS[k].description}</span></li>)}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Historial</h2><span className="muted">{rows.length}</span></div>
        {rows.length === 0 ? (
          <div className="empty"><p>Claude todavía no ha hecho cambios.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cuándo</th><th>Acción</th><th>Negocio</th><th>Detalle</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const tool = r.action.replace(/^claude\./, "");
                  const d = { ...r.details };
                  delete d.actor;
                  return (
                    <tr key={r.id}>
                      <td className="muted">{dateTime(r.at)}</td>
                      <td><b>{LABEL[tool] ?? tool}</b></td>
                      <td>{r.business_id ? <Link href={`/admin/b/${r.business_id}`}>{r.entity_id}</Link> : r.entity_id}</td>
                      <td className="muted" style={{ fontSize: 13 }}>{Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
