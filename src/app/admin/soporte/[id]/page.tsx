import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { AUTHOR, CATEGORY, T_STATUS, ticketThread } from "@/lib/support";
import { replySupportAdmin } from "../../actions";
import { Flash } from "../../Flash";
import { dateTime } from "../../format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

/** One support request: the conversation, the answer box and its status. */
export default async function SupportTicket({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const th = await ticketThread(id);
  if (!th) notFound();
  const t = th.ticket;
  return (
    <main className="container admin-main" style={{ maxWidth: 820 }}>
      <div>
        <Link className="crumb" href="/admin/soporte">← Soporte</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>#{t.number} · {t.subject}</h1>
            <p>{t.business ? <Link href={`/admin/b/${t.business.id}`}>{t.business.name}</Link> : "Negocio eliminado"} · {CATEGORY[t.category]} · abierta por {AUTHOR[t.opened_by]} el {dateTime(t.created_at)}</p>
          </div>
          <span className={`sp-pill sp-${t.status}`}>{T_STATUS[t.status]}</span>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      <section className="panel">
        <ol className="sp-thread">
          {th.messages.map((m) => (
            <li key={m.id} className={m.author === "founder" ? "sp-me" : "sp-them"}>
              <small>{AUTHOR[m.author]} · {dateTime(m.created_at)}</small>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
        <form action={replySupportAdmin} className="form-section">
          <input type="hidden" name="ticket_id" value={t.id} />
          <label className="field"><span>Responder</span><textarea className="textarea" name="body" required maxLength={2000} style={{ minHeight: 110 }} /></label>
          <SubmitButton className="btn btn-dark" pending="Enviando…">Enviar respuesta</SubmitButton>
        </form>
        <form action={replySupportAdmin} className="form-section" style={{ borderTop: "1px solid var(--line)" }}>
          <input type="hidden" name="ticket_id" value={t.id} />
          <input type="hidden" name="status" value={t.status === "resolved" ? "open" : "resolved"} />
          <SubmitButton className="btn btn-ghost btn-sm" pending="…">{t.status === "resolved" ? "Reabrir" : "Marcar como resuelta"}</SubmitButton>
        </form>
      </section>
    </main>
  );
}
