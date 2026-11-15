import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { accessRole } from "@/lib/access";
import { billingState, todayPanama } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail, contactsFor } from "@/lib/data";
import { phoneDigits } from "@/lib/reservation-rules";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ q?: string; f?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Mis clientes · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

type Row = { key: string; name: string; phone: string | null; club: boolean; bday: string | null; bdayMonth: number | null; visits: number; reservations: number; noShows: number; last: string | null; next: string | null; joined: string | null };
type Resv = { customer_name: string; phone: string | null; reserved_on: string; status: string };

/** 50760001234 → +507 6000-1234; other numbers keep their digits with a + in front. */
const showPhone = (v: string | null) => {
  if (!v) return "Sin teléfono";
  const d = v.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("507")) return `+507 ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d.length > 8 ? `+${d}` : v;
};
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDate = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

/** One list of the people who come back: the club and the reservations, joined by phone. */
export default async function ClientsPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await accessRole(b))) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const [d, contacts, resv] = await Promise.all([
    businessDetail(b.id),
    contactsFor(b.id),
    db().from("reservations").select("customer_name, phone, reserved_on, status").eq("business_id", b.id).order("reserved_on", { ascending: false }).limit(3000),
  ]);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(home);

  const today = todayPanama();
  const rows = new Map<string, Row>();
  for (const c of contacts) {
    const key = phoneDigits(c.phone) ?? `c:${c.id}`;
    rows.set(key, {
      key, name: c.name, phone: c.phone, club: true,
      bday: c.birthday_month && c.birthday_day ? `${c.birthday_day} ${MONTHS[c.birthday_month - 1]}` : null, bdayMonth: c.birthday_month,
      visits: 0, reservations: 0, noShows: 0, last: null, next: null, joined: c.created_at.slice(0, 10),
    });
  }
  for (const r of (resv.data ?? []) as Resv[]) {
    if (r.status === "canceled") continue;
    const key = phoneDigits(r.phone) ?? `n:${r.customer_name.trim().toLowerCase()}`;
    const row = rows.get(key) ?? { key, name: r.customer_name, phone: r.phone, club: false, bday: null, bdayMonth: null, visits: 0, reservations: 0, noShows: 0, last: null, next: null, joined: null };
    row.reservations++;
    if (r.status === "attended") { row.visits++; if (!row.last || r.reserved_on > row.last) row.last = r.reserved_on; }
    if (r.status === "no_show") row.noShows++;
    if (r.reserved_on >= today && (r.status === "pending" || r.status === "confirmed") && (!row.next || r.reserved_on < row.next)) row.next = r.reserved_on;
    rows.set(key, row);
  }

  const month = Number(today.slice(5, 7));
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const all = [...rows.values()];
  const list = all
    .filter((r) => (sp.f === "cumple" ? r.bdayMonth === month : sp.f === "club" ? r.club : sp.f === "vuelven" ? r.visits >= 2 : true))
    .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000"))
    .sort((a, z) => (z.next ?? z.last ?? z.joined ?? "").localeCompare(a.next ?? a.last ?? a.joined ?? ""));
  const tabs = [
    { f: "", label: "Todos", n: all.length },
    { f: "club", label: "En el club", n: all.filter((r) => r.club).length },
    { f: "vuelven", label: "Vuelven", n: all.filter((r) => r.visits >= 2).length },
    { f: "cumple", label: "Cumplen este mes", n: all.filter((r) => r.bdayMonth === month).length },
  ];

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings">
        <div>
          <h1 className="owner-title">Mis clientes</h1>
          <p className="muted">Tu club y tus reservas en una sola lista. Las visitas cuentan las reservas en que el cliente llegó.</p>
        </div>

        <nav className="cl-tabs" aria-label="Filtrar">
          {tabs.map((t) => (
            <Link key={t.f} href={t.f ? `?f=${t.f}` : "?"} className={(sp.f ?? "") === t.f ? "on" : undefined}>{t.label} <span className="num">{t.n}</span></Link>
          ))}
        </nav>

        <form className="cl-search" role="search">
          {sp.f && <input type="hidden" name="f" value={sp.f} />}
          <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nombre o teléfono" aria-label="Buscar cliente" />
          <button className="btn btn-ghost btn-sm" type="submit">Buscar</button>
        </form>

        <section className="panel">
          {list.length === 0 ? (
            <div className="empty"><p>{all.length === 0 ? "Aún no tienes clientes: aparecen cuando se unen a tu club o reservan desde la placa." : "Nadie coincide con este filtro."}</p></div>
          ) : (
            <ul className="cl-list">
              {list.map((r) => (
                <li key={r.key}>
                  <div className="cl-main">
                    <b>{r.name}</b>
                    <small className="muted">{showPhone(r.phone)}{r.bday ? ` · 🎂 ${r.bday}` : ""}</small>
                    <span className="cl-tags">
                      {r.club && <span className="sp-pill sp-answered">Club</span>}
                      {r.next && <span className="sp-pill sp-open">Reserva {fmtDate(r.next)}</span>}
                      {r.noShows > 0 && <span className="sp-pill sp-resolved">{r.noShows} sin llegar</span>}
                    </span>
                  </div>
                  <div className="cl-stats">
                    <span><b className="num">{r.visits}</b> {r.visits === 1 ? "visita" : "visitas"}</span>
                    <small className="muted">{r.last ? `Última visita: ${fmtDate(r.last)}` : r.joined ? `En el club desde ${fmtDate(r.joined)}` : `${r.reservations} ${r.reservations === 1 ? "reserva" : "reservas"}`}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="muted" style={{ fontSize: 13 }}>Envía promociones solo a quienes están en tu club: ellos dieron su permiso. Puedes descargar el club en Excel desde tu resumen.</p>
      </main>
    </div>
  );
}
