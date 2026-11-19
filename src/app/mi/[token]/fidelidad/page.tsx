import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { Upsell } from "@/components/Upsell";
import { accessRole } from "@/lib/access";
import { billingState } from "@/lib/agenda";
import { businessDetail, businessByOwnerToken } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { cardByCode, loyaltyStats, programFor } from "@/lib/loyalty-cards";
import { formatPhone } from "@/lib/phone";
import { makeVisitCode, saveLoyaltyProgram, stampByCode } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string; c?: string; vc?: string }> };

const OK: Record<string, string> = {
  guardado: "Listo: tu tarjeta de fidelidad quedó guardada.",
  sello: "Sello agregado.",
  completa: "Sello agregado. ¡La tarjeta está completa! Entrega el premio.",
  canjeado: "Premio entregado. La tarjeta empieza otra vez.",
};
const ago = (iso: string | null) => {
  if (!iso) return "Sin sellos aún";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`;
};

/** Loyalty card: the owner sets the reward; the team stamps cards by code (or scanning the customer's QR). */
export default async function LoyaltyPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const top = <header className="admin-top"><div className="container"><Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link><Logo size={20} /></div></header>;
  if (!(await can(b, "loyalty"))) {
    return <div className="admin">{top}<main className="container admin-main settings"><h1 className="owner-title">Tarjeta de fidelidad</h1><Upsell feature="loyalty" token={token} /></main></div>;
  }
  const d = await businessDetail(b.id);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused" || billing.kind === "ended") redirect(home);
  const [program, stats, found] = await Promise.all([programFor(b.id), loyaltyStats(b.id), sp.c ? cardByCode(b.id, sp.c) : Promise.resolve(null)]);
  const plaque = d?.tags.find((t) => t.active);
  const full = found ? found.stamps >= program.stamps_needed : false;

  return (
    <div className="admin">
      {top}
      <main className="container admin-main settings">
        <h1 className="owner-title">Programa de fidelidad</h1>
        <p className="muted">Tus clientes crean su tarjeta desde la placa y la guardan en su teléfono, con tu logo y tus colores. En cada visita le pones un sello; al completarla reciben su premio.</p>
        {sp.ok && OK[sp.ok] && <p className="alert alert-ok" role="status">{OK[sp.ok]}</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}

        <section className="lc-kpis" aria-label="Estadísticas">
          <div><b className="num">{stats.cards}</b><span>Clientes registrados</span></div>
          <div><b className="num">{stats.active}</b><span>Activos (30 días)</span></div>
          <div><b className="num">{stats.visits}</b><span>Visitas verificadas</span></div>
          <div><b className="num">{stats.pending}</b><span>Recompensas por entregar</span></div>
          <div><b className="num">{stats.rewardsAll}</b><span>Recompensas canjeadas</span></div>
          <div><b className="num">{stats.completion}%</b><span>Completaron la tarjeta</span></div>
          <div><b className="num">{stats.returnDays ?? "—"}</b><span>Días promedio entre visitas</span></div>
          <div><b className="num">{stats.stamps30}</b><span>Sellos (30 días)</span></div>
        </section>

        {program.enabled && (
          <section className="panel" id="codigo">
            <div className="panel-head"><h2>Código de visita</h2></div>
            <div className="msg">
              <p className="muted">Para cuando no puedes escanear: genera un código de 6 números y dáselo al cliente. Lo escribe en su tarjeta y suma su visita. Sirve una vez y vence en 10 minutos.</p>
              {sp.vc && <p className="lc-vc num" role="status">{sp.vc.slice(0, 3)} {sp.vc.slice(3)}</p>}
              <form action={makeVisitCode}><input type="hidden" name="token" value={token} /><SubmitButton className="btn btn-dark" pending="Generando…">Generar código de visita</SubmitButton></form>
            </div>
          </section>
        )}

        {program.enabled && (
          <section className="panel" id="sellar">
            <div className="panel-head"><h2>Sellar una tarjeta</h2></div>
            <div className="msg">
              <p className="muted">Escanea el QR de la tarjeta del cliente con la cámara de tu teléfono, o escribe aquí su código (está en la tarjeta). Para entregar un premio, escribe el código de recompensa que empieza con R.</p>
              <form action={stampByCode} className="lc-codeform">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="op" value="find" />
                <input className="input lc-codeinput" name="code" required maxLength={8} placeholder="ABC 234 o R…" autoCapitalize="characters" autoComplete="off" defaultValue={found?.code ?? ""} aria-label="Código de la tarjeta" />
                <SubmitButton className="btn btn-dark" pending="Buscando…">Buscar</SubmitButton>
              </form>
              {found && (
                <div className="lc-found">
                  <div><b>{found.name}</b><small className="muted">{formatPhone(found.phone)} · {ago(found.last_stamp_at)}</small></div>
                  <div className="lc-count"><b className="num">{found.stamps}</b><span>de {program.stamps_needed}</span></div>
                  {full && found.reward_code && <p className="alert alert-ok">Recompensa lista · código <b>{found.reward_code}</b>. Verifica que coincida con el del cliente.</p>}
                  <form action={stampByCode}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="code" value={found.code} />
                    <input type="hidden" name="op" value={full ? "redeem" : "stamp"} />
                    <SubmitButton className="btn btn-dark btn-block" pending="Guardando…">{full ? "Entregar premio y reiniciar" : "Agregar sello"}</SubmitButton>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="panel" id="premio">
          <div className="panel-head"><h2>Tu tarjeta</h2><span className={`pill ${program.enabled ? "bill-ok" : ""}`}>{program.enabled ? "Activa en tu placa" : "Apagada"}</span></div>
          {role !== "owner" ? (
            <div className="msg"><p>Premio: <b>{program.reward || "Sin definir"}</b> al juntar {program.stamps_needed} sellos. Solo el dueño puede cambiarlo.</p></div>
          ) : (
            <form action={saveLoyaltyProgram} className="form-section">
              <input type="hidden" name="token" value={token} />
              <label className="check"><input type="checkbox" name="enabled" value="1" defaultChecked={program.enabled} /><span>Mostrar la tarjeta de fidelidad en mi placa</span></label>
              <div className="grid-2">
                <label className="field"><span>Sellos para el premio</span>
                  <select className="select" name="stamps_needed" defaultValue={program.stamps_needed}>{[4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map((n) => <option key={n} value={n}>{n} sellos</option>)}</select>
                </label>
                <label className="field"><span>Tiempo mínimo entre sellos</span>
                  <select className="select" name="cooldown_hours" defaultValue={program.cooldown_hours}>{[[0, "Sin límite"], [1, "1 hora"], [3, "3 horas"], [6, "6 horas"], [12, "12 horas"], [24, "1 día"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
              </div>
              <div className="grid-2">
                <label className="field"><span>Nombre de la campaña (opcional)</span><input className="input" name="name" maxLength={40} defaultValue={program.name} placeholder="Ej.: Club del café" /></label>
                <span />
              </div>
              <label className="field"><span>Condiciones adicionales (opcional)</span><input className="input" name="terms" maxLength={500} defaultValue={program.terms} placeholder="Ej.: Válido de lunes a viernes. No acumulable con otras promociones." /></label>
              <label className="field"><span>Premio</span><input className="input" name="reward" maxLength={120} placeholder="Ej.: Un corte gratis · Un postre de la casa · 10% en tu próxima compra" defaultValue={program.reward} /></label>
              <small className="muted">El tiempo mínimo evita que una misma tarjeta se selle dos veces en la misma visita.</small>
              <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar</SubmitButton>
              {program.enabled && plaque && <Link className="btn btn-ghost btn-sm" href={`/t/${plaque.code}/tarjeta`} target="_blank">Ver cómo la crea tu cliente</Link>}
            </form>
          )}
        </section>

        {stats.suspicious.length > 0 && (
          <section className="panel">
            <div className="panel-head"><h2>Actividad para revisar</h2></div>
            <ul className="tp-comments">{stats.suspicious.map((x) => <li key={x.what + x.when} className="low"><p>{x.what}</p><small className="muted">{new Date(x.when).toLocaleString("es-PA", { timeZone: "America/Panama" })}</small></li>)}</ul>
          </section>
        )}

        {stats.recent.length > 0 && (
          <section className="panel">
            <div className="panel-head"><h2>Tarjetas recientes</h2></div>
            <ul className="lc-list">
              {stats.recent.map((c) => (
                <li key={c.id}>
                  <span><b>{c.name}</b><small className="muted">{ago(c.last_stamp_at)}{c.rewards ? ` · ${c.rewards} ${c.rewards === 1 ? "premio" : "premios"}` : ""}</small></span>
                  <span className="lc-mini">{c.reward_code ? "Recompensa lista" : `${c.stamps}/${program.stamps_needed}`}</span>
                  <Link className="btn btn-ghost btn-sm" href={`?c=${c.code}#sellar`}>Sellar</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel">
          <div className="panel-head"><h2>Cómo funciona</h2></div>
          <ol className="form-section">
            <li>El cliente toca tu placa y elige “Tarjeta de fidelidad”. Escribe su nombre y WhatsApp, y la guarda en su teléfono.</li>
            <li>En cada visita, escaneas el QR de su tarjeta con la cámara (la primera vez ese teléfono pide tu código de acceso) o escribes el código aquí.</li>
            <li>Cuando completa los sellos, le entregas el premio y la tarjeta empieza otra vez.</li>
          </ol>
          <small className="muted">La tarjeta se guarda en la pantalla de inicio del teléfono como una app y siempre muestra datos reales. Los sellos solo los da tu personal (QR o código de visita): abrir la página o tocar una placa nunca suma sellos. Apple Wallet y Google Wallet llegarán más adelante como opción.</small>
        </section>
      </main>
    </div>
  );
}
