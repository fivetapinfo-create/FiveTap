import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSetup } from "@/components/AppSetup";
import { CopyButton } from "@/components/CopyButton";
import { SecretValue } from "@/components/RevealInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { human, nextCharge, todayPanama } from "@/lib/agenda";
import { CANCEL_REASONS } from "@/lib/cancel";
import { businessByOwnerToken, businessDetail } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { SITE_URL, salesWhatsAppUrl } from "@/lib/site";
import { methodName } from "@/lib/receipts";
import { requestCancel, undoCancel } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Configuración · FiveTap",
    robots: { index: false, follow: false },
    manifest: `/mi/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "FiveTap", statusBarStyle: "black" },
  };
}

const KIND = { setup: "Instalación", monthly: "Mensualidad", annual: "Plan anual", pieces: "Piezas", other: "Otro" } as const;
const money = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => human(iso.slice(0, 10));

/** The owner's settings: notifications, their subscription (and cancelling it), contacts and help. */
export default async function OwnerSettings({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const d = await businessDetail(b.id);
  if (!d) notFound();
  const { payments } = d;
  const charge = nextCharge(b, payments);
  const today = todayPanama();
  const home = `/mi/${token}`;
  const planName = b.mode === "google" ? "Piezas sin plan (directo a Google)" : charge?.kind === "annual" ? "Plan anual" : b.status === "trial" ? "FiveTap Test" : "Plan mensual";
  const canceled = b.status === "canceled";
  const help = (msg: string) => salesWhatsAppUrl(`Hola, soy de ${b.name}. ${msg}`);

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
          <h1 className="owner-title">Configuración</h1>
          <p className="muted">{b.name}</p>
        </div>

        {sp.ok === "cancelado" && <p className="alert alert-ok" role="status">Recibimos tu solicitud. No se te volverá a cobrar y te escribiremos para coordinar el retiro de las placas.</p>}
        {sp.ok === "sigue" && <p className="alert alert-ok" role="status">¡Qué bueno que sigues con nosotros! Tu plan continúa igual.</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error === "motivo" ? "Elige un motivo para continuar." : "No se pudo guardar. Inténtalo otra vez."}</p>}

        <AppSetup
          endpoint={`${home}/push`}
          benefits={["Avisos al instante de cada mensaje privado.", "Tu resumen cada mañana y tu recuento de reseñas a fin de mes."]}
          roles={[
            { value: "owner", label: "Soy dueño/a", hint: "Recibes todo, incluidos los recordatorios de pago." },
            { value: "manager", label: "Gerente, supervisor/a o encargado/a", hint: "Recibes los mensajes de clientes y el resumen diario. Sin recordatorios de pago." },
          ]}
        />

        <section className="panel" id="suscripcion">
          <div className="panel-head">
            <h2>Suscripción</h2>
            <span className={`pill ${b.cancel_requested_at ? "canceled" : b.status}`}>
              {canceled ? "Cancelada" : b.cancel_requested_at ? "Cancelación solicitada" : b.status === "trial" ? "En prueba" : b.status === "paused" ? "Pausada" : "Activa"}
            </span>
          </div>
          <dl className="kv settings-kv">
            <dt>Plan</dt>
            <dd>{planName}</dd>
            {charge && !canceled && (
              <>
                <dt>{b.cancel_requested_at ? "Activo hasta" : charge.due < today ? "Pago pendiente desde" : b.status === "trial" ? "Primer cobro" : "Próximo cobro"}</dt>
                <dd>
                  {day(charge.due)}
                  {!b.cancel_requested_at && <> · <b>{money(charge.amount)}</b></>}
                </dd>
                <dt>Forma de pago</dt>
                <dd>{charge.auto ? "PayPal · se cobra solo" : "Yappy, transferencia o tarjeta"}</dd>
              </>
            )}
          </dl>
          <div className="msg">
            <div className="row">
              {charge && !charge.auto && !b.cancel_requested_at && !canceled && <a className="btn btn-dark btn-sm" href={`/pagar?n=${encodeURIComponent(b.name)}`}>Ver cómo pagar</a>}
              <Link className="btn btn-ghost btn-sm" href={`${home}/pagos`}>Facturación y pagos</Link>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Concepto</th><th className="right">Monto</th></tr></thead>
                <tbody>
                  {payments.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td>{day(p.paid_at)}</td>
                      <td>{KIND[p.kind]} <span className="muted">· {methodName(p)}</span></td>
                      <td className="right num">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!canceled && b.mode === "full" && (
            b.cancel_requested_at ? (
              <div className="msg">
                <p>Pediste cancelar el <b>{day(b.cancel_requested_at)}</b>{b.cancel_reason ? ` · “${b.cancel_reason}”` : ""}.</p>
                {charge?.auto && (
                  <p className="muted">
                    Si pagas con PayPal, desactiva también el cobro automático en{" "}
                    <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>PayPal → Pagos automáticos</a>.
                  </p>
                )}
                <form action={undoCancel}>
                  <input type="hidden" name="token" value={token} />
                  <SubmitButton className="btn btn-ghost btn-sm" pending="Guardando…">Cambié de opinión, sigo con mi plan</SubmitButton>
                </form>
              </div>
            ) : (
              <details className="cancel-box">
                <summary>Cancelar mi plan</summary>
                <form action={requestCancel} className="cancel-form">
                  <input type="hidden" name="token" value={token} />
                  <p>Antes de irte, cuéntanos en breve por qué. Nos ayuda a mejorar.</p>
                  <div className="chips-pick" role="radiogroup" aria-label="Motivo">
                    {CANCEL_REASONS.map((r) => (
                      <label key={r} className="pick">
                        <input type="radio" name="reason" value={r} required />
                        {r}
                      </label>
                    ))}
                  </div>
                  <textarea className="input" name="detail" rows={2} maxLength={300} placeholder="¿Algo más? (opcional)" />
                  <p className="muted">
                    {charge?.kind === "annual"
                      ? "Tu plan anual sigue activo hasta que termine el año ya pagado, que no se reembolsa."
                      : "No se te vuelve a cobrar. El servicio sigue hasta el final del período ya pagado."}{" "}
                    Luego retiramos las placas.
                  </p>
                  <SubmitButton className="btn btn-danger btn-sm" pending="Enviando…">Confirmar cancelación</SubmitButton>
                </form>
              </details>
            )
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Apariencia</h2></div>
          <div className="msg">
            <p className="muted">Elige cómo prefieres ver FiveTap en este celular.</p>
            <ThemeToggle className="btn btn-ghost btn-sm theme-pick" labelled />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Contactos del local</h2></div>
          <dl className="kv settings-kv">
            <dt>Reciben las quejas</dt>
            <dd>{b.manager_name || "—"}{b.manager_phone ? ` · ${formatPhone(b.manager_phone)}` : ""}</dd>
            <dt>Paga FiveTap</dt>
            <dd>{b.billing_name || b.manager_name || "—"}{b.billing_phone ? ` · ${formatPhone(b.billing_phone)}` : ""}</dd>
          </dl>
          <div className="msg">
            <a className="btn btn-ghost btn-sm" style={{ width: "fit-content" }} href={help("Quiero cambiar un contacto del local en FiveTap.")}>Pedir un cambio</a>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Tu acceso</h2></div>
          <div className="msg">
            <p className="muted">Tu FiveTap no usa contraseña: entras con este enlace privado. Guárdalo y no lo compartas fuera de tu equipo.</p>
            <SecretValue value={`${SITE_URL}${home}`} label="Copiar mi enlace" />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Tu equipo</h2></div>
          <div className="msg">
            <p className="muted">Envía este enlace a tu gerente o encargado/a para que instale FiveTap en su celular. Es privado: solo para tu equipo de confianza.</p>
            <div className="row">
              <CopyButton value={`${SITE_URL}${home}?instalar=1&rol=gerente`} label="Copiar enlace para el gerente" />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Ayuda</h2></div>
          <div className="msg">
            <div className="row">
              <a className="btn btn-ghost btn-sm" href={help("Tengo una consulta sobre FiveTap.")}>Escribir a soporte</a>
              <a className="btn btn-ghost btn-sm" href={help("Una placa no funciona o está dañada.")}>Reportar una placa</a>
            </div>
            <p className="muted owner-note">
              <Link href="/terminos" style={{ textDecoration: "underline" }}>Términos</Link> ·{" "}
              <Link href="/privacidad" style={{ textDecoration: "underline" }}>Privacidad</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
