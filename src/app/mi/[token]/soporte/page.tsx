import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { AUTHOR, CATEGORY, T_STATUS, ticketThread, ticketsFor } from "@/lib/support";
import { dateTime } from "../../../admin/format";
import { openSupport, replySupport } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ t?: string; ok?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Soporte · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

/** Support: the owner or manager asks FiveTap and follows the answer, all in one place. */
export default async function SupportPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await accessRole(b))) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const [list, thread] = await Promise.all([ticketsFor(b.id), sp.t ? ticketThread(sp.t, { businessId: b.id }) : Promise.resolve(null)]);
  return (
    <div className="admin">
      <LiveRefresh seconds={30} />
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings">
        <div>
          <h1 className="owner-title">Soporte</h1>
          <p className="muted">Escríbenos aquí cualquier duda o problema. Te respondemos en esta misma página y te llega un aviso al celular.</p>
        </div>
        {sp.ok === "enviada" && <p className="alert alert-ok" role="status">Recibimos tu solicitud. Te avisamos cuando respondamos.</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        {thread && (
          <section className="panel" id="hilo">
            <div className="panel-head">
              <h2>#{thread.ticket.number} · {thread.ticket.subject}</h2>
              <span className={`sp-pill sp-${thread.ticket.status}`}>{T_STATUS[thread.ticket.status]}</span>
            </div>
            <ol className="sp-thread">
              {thread.messages.map((m) => (
                <li key={m.id} className={m.author === "founder" ? "sp-them" : "sp-me"}>
                  <small>{AUTHOR[m.author]} · {dateTime(m.created_at)}</small>
                  <p>{m.body}</p>
                </li>
              ))}
            </ol>
            {thread.ticket.status !== "resolved" ? (
              <form action={replySupport} className="form-section sp-reply">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="ticket_id" value={thread.ticket.id} />
                <label className="field"><span>Tu respuesta</span><textarea className="textarea" name="body" maxLength={2000} required style={{ minHeight: 90 }} /></label>
                <div className="row">
                  <SubmitButton className="btn btn-dark btn-sm" pending="Enviando…">Enviar</SubmitButton>
                </div>
              </form>
            ) : (
              <p className="muted" style={{ padding: "0 20px 16px" }}>Esta solicitud está resuelta. Si necesitas algo más, abre una nueva.</p>
            )}
            {thread.ticket.status !== "resolved" && (
              <form action={replySupport} style={{ padding: "0 20px 16px" }}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="ticket_id" value={thread.ticket.id} />
                <input type="hidden" name="resolve" value="1" />
                <SubmitButton className="btn btn-ghost btn-sm" pending="…">Ya está resuelto</SubmitButton>
              </form>
            )}
          </section>
        )}

        <details className="panel more" id="nueva" open={!thread && list.length === 0}>
          <summary>Nueva solicitud</summary>
          <form action={openSupport} className="form-section">
            <input type="hidden" name="token" value={token} />
            <div className="grid-2">
              <label className="field">
                <span>Tema</span>
                <select className="select" name="category" defaultValue="question">
                  {Object.entries(CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="field"><span>Asunto</span><input className="input" name="subject" required minLength={3} maxLength={120} placeholder="Ej. La placa de la mesa 4 no abre" /></label>
            </div>
            <label className="field"><span>Cuéntanos qué pasa</span><textarea className="textarea" name="body" required minLength={3} maxLength={2000} style={{ minHeight: 110 }} /></label>
            <SubmitButton className="btn btn-dark" pending="Enviando…">Enviar a FiveTap</SubmitButton>
          </form>
        </details>

        <section className="panel">
          <div className="panel-head"><h2>Mis solicitudes</h2><span className="muted">{list.length}</span></div>
          {list.length === 0 ? (
            <div className="empty"><p>Aún no has enviado solicitudes.</p></div>
          ) : (
            <ul className="sp-list">
              {list.map((t) => (
                <li key={t.id}>
                  <Link href={`?t=${t.id}#hilo`} className={t.id === sp.t ? "on" : undefined}>
                    <span><b>#{t.number} · {t.subject}</b><small className="muted">{CATEGORY[t.category]} · {dateTime(t.updated_at)}</small></span>
                    <span className={`sp-pill sp-${t.status}`}>{T_STATUS[t.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
