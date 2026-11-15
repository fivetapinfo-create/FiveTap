import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { moduleOn } from "@/lib/orders";
import { salesWhatsAppUrl } from "@/lib/site";
import { db } from "@/lib/supabase";
import { guidesFor } from "@/lib/training";
import { markGuide } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Ayuda · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

/** Help center: short guides for owner, manager and staff, with progress, plus support. */
export default async function HelpPage({ params }: Props) {
  const { token } = await params;
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  const home = `/mi/${token}`;
  const guides = guidesFor({ orders: moduleOn(b, "orders"), reservations: moduleOn(b, "reservations") });
  const { data } = await db().from("training_progress").select("guide").eq("business_id", b.id).eq("role", role);
  const done = new Set(((data ?? []) as { guide: string }[]).map((x) => x.guide));
  const count = guides.filter((g) => done.has(g.key)).length;
  const pct = guides.length ? Math.round((count / guides.length) * 100) : 0;
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
          <h1 className="owner-title">Ayuda y capacitación</h1>
          <p className="muted">Guías cortas para ti, tu gerente y tu equipo. Márcalas cuando las leas.</p>
        </div>

        <div className="panel tr-progress">
          <div>
            <b>{count} de {guides.length} guías leídas</b>
            <span className="muted">{role === "owner" ? "Tu progreso como dueño/a" : "Tu progreso como gerente"}</span>
          </div>
          <div className="tr-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="row tr-help">
          <Link className="btn btn-dark btn-sm" href={`${home}/soporte`}>Escribir a soporte</Link>
          <a className="btn btn-ghost btn-sm" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Necesito ayuda con FiveTap.`)}>WhatsApp de FiveTap</a>
        </div>

        <div className="tr-list">
          {guides.map((g, n) => {
            const read = done.has(g.key);
            return (
              <details key={g.key} id={g.key} className={`panel tr-guide${read ? " read" : ""}`}>
                <summary>
                  <span className="tr-num num">{read ? "✓" : n + 1}</span>
                  <span className="tr-title"><b>{g.title}</b><small className="muted">{g.who} · {g.minutes} min</small></span>
                </summary>
                <ol className="tr-steps">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                {g.tip && <p className="tr-tip">{g.tip}</p>}
                <form action={markGuide} className="tr-mark">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="guide" value={g.key} />
                  <input type="hidden" name="done" value={read ? "0" : "1"} />
                  <SubmitButton className={`btn btn-sm ${read ? "btn-ghost" : "btn-dark"}`} pending="…">{read ? "Marcar como no leída" : "Marcar como leída"}</SubmitButton>
                </form>
              </details>
            );
          })}
        </div>
      </main>
    </div>
  );
}
