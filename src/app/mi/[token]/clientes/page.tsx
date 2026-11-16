import { Cake } from "@/components/Icons";
import type { Metadata } from "next";
import { can } from "@/lib/entitlements";
import { Upsell } from "@/components/Upsell";
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

type Row = { key: string; name: string; phone: string | null; club: boolean; bday: string | null; bdayMonth: number | null; visits: number; reservations: number; noShows: number; last: string | null; next: string | null; joined: string | null; source: string | null };
type Resv = { customer_name: string; phone: string | null; reserved_on: string; status: string };

/** 50760001234 → +507 6000-1234; other numbers keep their digits with a + in front. */
const showPhone = (v: string | null) => {
  if (!v) return "Sin teléfono";
  const d = v.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("507")) return `+507 ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d.length > 8 ? `+${d}` : v;
};
/** Initials on a soft color that stays the same for the same name. */
const TONES = ["#e8f1ff", "#fdeee3", "#e6f5ec", "#f3e8ff", "#fff4d6", "#e7f6f7", "#fde7ef"];
const INKS = ["#1f4fa8", "#a8501f", "#1f7a45", "#6a2fb0", "#8a6200", "#1f6f74", "#a42a5a"];
const tone = (name: string) => [...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length;
const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const waLink = (phone: string | null, text: string) => { const d = phoneDigits(phone); return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null; };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDate = (d: string) => { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

/** One list of the people who come back: the club and the reservations, joined by phone. */
const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
);

export default async function ClientsPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await accessRole(b))) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  if (!(await can(b, "clients"))) {
    return (
      <div className="admin">
        <header className="admin-top"><div className="container"><Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link><Logo size={20} /></div></header>
        <main className="container admin-main settings"><h1 className="owner-title">Mis clientes</h1><Upsell feature="clients" token={token} /></main>
      </div>
    );
  }
  const [d, contacts, resv] = await Promise.all([
    businessDetail(b.id),
    contactsFor(b.id),
    db().from("reservations").select("customer_name, phone, reserved_on, status").eq("business_id", b.id).order("reserved_on", { ascending: false }).limit(3000),
  ]);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(home);

  const tagLabel = new Map((d?.tags ?? []).map((t) => [t.id, t.label]));
  const today = todayPanama();
  const rows = new Map<string, Row>();
  for (const c of contacts) {
    const key = phoneDigits(c.phone) ?? `c:${c.id}`;
    rows.set(key, {
      key, name: c.name, phone: c.phone, club: true,
      bday: c.birthday_month && c.birthday_day ? `${c.birthday_day} ${MONTHS[c.birthday_month - 1]}` : null, bdayMonth: c.birthday_month,
      visits: 0, reservations: 0, noShows: 0, last: null, next: null, joined: c.created_at.slice(0, 10), source: (c.tag_id && tagLabel.get(c.tag_id)) || null,
    });
  }
  for (const r of (resv.data ?? []) as Resv[]) {
    if (r.status === "canceled") continue;
    const key = phoneDigits(r.phone) ?? `n:${r.customer_name.trim().toLowerCase()}`;
    const row = rows.get(key) ?? { key, name: r.customer_name, phone: r.phone, club: false, bday: null, bdayMonth: null, visits: 0, reservations: 0, noShows: 0, last: null, next: null, joined: null, source: null };
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
            <ul className="ct-list">
              {list.map((r) => {
                const t = tone(r.name);
                const first = r.name.trim().split(/\s+/)[0] ?? r.name;
                const wa = waLink(r.phone, r.club ? `Hola ${first}, te escribimos de ${b.name}.` : `Hola ${first}, te escribimos de ${b.name} sobre tu reserva.`);
                return (
                  <li key={r.key}>
                    <details className="ct">
                      <summary>
                        <span className="ct-av" style={{ background: TONES[t], color: INKS[t] }} aria-hidden="true">{initialsOf(r.name)}</span>
                        <span className="ct-main">
                          <b>{r.name}</b>
                          <small className="muted">{showPhone(r.phone)}</small>
                          <span className="cl-tags">
                            {r.club && <span className="sp-pill sp-answered">Club</span>}
                            {r.next && <span className="sp-pill sp-open">Reserva {fmtDate(r.next)}</span>}
                            {r.bday && r.bdayMonth === month && <span className="sp-pill sp-open ct-bday"><Cake /> {r.bday}</span>}
                          </span>
                        </span>
                        {wa && <span className="ct-wa" aria-hidden="true"><WaIcon /></span>}
                      </summary>
                      <div className="ct-card">
                        <dl className="ct-facts">
                          <dt>Teléfono</dt><dd>{showPhone(r.phone)}</dd>
                          {r.joined && <><dt>En el club desde</dt><dd>{fmtDate(r.joined)}{r.source ? ` · desde ${r.source}` : ""}</dd></>}
                          {r.bday && <><dt>Cumpleaños</dt><dd>{r.bday}</dd></>}
                          <dt>Visitas</dt><dd>{r.visits}{r.last ? ` · última ${fmtDate(r.last)}` : ""}</dd>
                          {r.reservations > 0 && <><dt>Reservas</dt><dd>{r.reservations}{r.noShows ? ` · ${r.noShows} sin llegar` : ""}</dd></>}
                          {r.next && <><dt>Próxima reserva</dt><dd>{fmtDate(r.next)}</dd></>}
                          <dt>Permiso</dt><dd>{r.club ? "Aceptó recibir promociones" : "Solo datos de su reserva: no le envíes promociones"}</dd>
                        </dl>
                        {wa ? (
                          <a className="btn btn-wa btn-block" href={wa} target="_blank" rel="noopener noreferrer"><WaIcon /> {r.club ? "Escribir por WhatsApp" : "WhatsApp sobre su reserva"}</a>
                        ) : (
                          <p className="muted">Este cliente no dejó un número válido de WhatsApp.</p>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className="muted" style={{ fontSize: 13 }}>Envía promociones solo a quienes están en tu club: ellos dieron su permiso. Puedes descargar el club en Excel desde tu resumen.</p>
      </main>
    </div>
  );
}
