import Link from "next/link";
import { MessageActions } from "@/components/MessageActions";
import { after } from "next/server";
import { BusinessLogo } from "@/components/BusinessLogo";
import { inbox, markRead } from "@/lib/data";
import { dateTime } from "../format";

export default async function Inbox() {
  const items = await inbox();
  const unreadIds = items.filter((m) => !m.read_at).map((m) => m.id);
  // Shown as "nuevo" this time, read from the next visit on.
  after(() => markRead({ ids: unreadIds }));

  return (
    <main className="container admin-main" style={{ maxWidth: 820 }}>
      <div className="admin-head">
        <div>
          <h1>Mensajes privados</h1>
          <p>{unreadIds.length ? `${unreadIds.length} nuevos` : "Todo leído"}</p>
        </div>
      </div>
      <section className="panel">
        {items.length === 0 ? (
          <div className="empty"><p>Aún no hay mensajes. Llegan aquí y al email del gerente.</p></div>
        ) : (
          items.map((m) => (
            <div key={m.id} className={`msg${m.read_at ? "" : " unread"}`}>
              <div className="msg-meta">
                <Link href={`/admin/b/${m.business.id}`} className="biz" style={{ gap: 8 }}>
                  <BusinessLogo name={m.business.name} logoUrl={m.business.logo_url} color={m.business.brand_color} className="biz-logo" />
                  <b style={{ color: "var(--ink)" }}>{m.business.name}</b>
                </Link>
                {m.rating ? <span className="msg-stars" aria-label={`${m.rating} de 5 estrellas`}>{"★".repeat(m.rating)}<i>{"★".repeat(5 - m.rating)}</i></span> : null}
                <span>{m.tag?.label ?? "—"}</span>
                <span>{dateTime(m.created_at)}</span>
                <span className={`msg-state ${m.resolved_at ? "done" : m.read_at ? "seen" : "new"}`}>{m.resolved_at ? "Resuelto por el local" : m.read_at ? "Visto" : "Nuevo"}</span>
              </div>
              <p><b>{m.name || "Sin nombre"}:</b> {m.message}</p>
              <MessageActions
                business={m.business.name}
                spot={m.tag?.label ?? null}
                guestName={m.name}
                guestPhone={m.phone}
                message={m.message}
                managerPhone={m.business.manager_phone}
              />
            </div>
          ))
        )}
      </section>
    </main>
  );
}
