import Link from "next/link";
import { CATEGORY, T_STATUS, allTickets, type TicketStatus } from "@/lib/support";
import { dateTime } from "../format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ estado?: string }> };
const TABS: { key: TicketStatus | "todas"; label: string }[] = [
  { key: "open", label: "Por responder" },
  { key: "answered", label: "Respondidas" },
  { key: "resolved", label: "Resueltas" },
  { key: "todas", label: "Todas" },
];

/** Every support request from every business, the ones waiting for an answer first. */
export default async function SupportInbox({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.estado) ?? TABS[0]!;
  const all = await allTickets();
  const shown = tab.key === "todas" ? all : all.filter((t) => t.status === tab.key);
  return (
    <main className="container admin-main">
      <div className="admin-head">
        <div>
          <h1>Soporte</h1>
          <p>Lo que tus clientes te escriben desde FiveTap Business. Al responder, les llega un aviso al celular.</p>
        </div>
      </div>
      <nav className="piece-filters" aria-label="Estado">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "open" ? "/admin/soporte" : `/admin/soporte?estado=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>
            {t.label} <b className="num">{t.key === "todas" ? all.length : all.filter((x) => x.status === t.key).length}</b>
          </Link>
        ))}
      </nav>
      <section className="panel">
        {shown.length === 0 ? (
          <div className="empty"><p>{tab.key === "open" ? "Nada por responder." : "No hay solicitudes aquí."}</p></div>
        ) : (
          <ul className="sp-list">
            {shown.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/soporte/${t.id}`}>
                  <span><b>#{t.number} · {t.subject}</b><small className="muted">{t.business?.name ?? "Negocio eliminado"} · {CATEGORY[t.category]} · {dateTime(t.updated_at)}</small></span>
                  <span className={`sp-pill sp-${t.status}`}>{T_STATUS[t.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
