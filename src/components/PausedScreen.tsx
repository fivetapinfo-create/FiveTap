import Link from "next/link";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Logo } from "@/components/Logo";
import { human, type Billing } from "@/lib/agenda";
import { salesWhatsAppUrl } from "@/lib/site";
import type { Business } from "@/lib/types";

const money = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/**
 * What the owner sees while the service is paused (late payment past the grace days, or
 * paused by FiveTap): how much, since when and how to pay. Their data is untouched.
 */
export function PausedScreen({ b, billing, token, plan }: { b: Business; billing: Billing; token: string; plan: string }) {
  const unpaid = billing.kind === "suspended";
  const ended = billing.kind === "ended";
  const help = salesWhatsAppUrl(unpaid ? `Hola, soy de ${b.name}. Quiero ponerme al día con mi pago de FiveTap.` : `Hola, soy de ${b.name}. Mi FiveTap aparece pausado, ¿me ayudas?`);
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Logo size={20} />
          <Link className="btn btn-sm owner-help" href={`/mi/${token}/ajustes`}>Configuración</Link>
        </div>
      </header>
      <main className="container admin-main paused">
        <div className="biz">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <div>
            <h1 className="owner-title">{b.name}</h1>
            <p className="muted">{plan}</p>
          </div>
        </div>

        <section className="owner-hero">
          <span>{ended ? "Tu prueba de FiveTap Test terminó" : unpaid ? "Tu servicio está pausado por un pago pendiente" : "Tu servicio está pausado"}</span>
          {unpaid && billing.charge && <b className="num">{money(billing.charge.amount)}</b>}
          <p>
            {ended
              ? "Elige tu plan y tus placas vuelven a funcionar el mismo día. Mientras tanto, tus clientes ven \"no disponible\"."
              : unpaid && billing.charge
                ? `Tu ${billing.charge.label} venció el ${human(billing.charge.due)}. Desde el ${human(billing.suspendsOn!)} tus placas muestran "no disponible" a tus clientes.`
                : "Tus placas muestran \"no disponible\" a tus clientes por ahora. Escríbenos y lo resolvemos."}
          </p>
          <p className="owner-hero-note">Tus datos están seguros: placas, mensajes, club y estadísticas siguen guardados y vuelven igual.</p>
        </section>

        <section className="panel">
          <div className="msg">
            {ended ? (
              <div className="row">
                <a className="btn btn-dark" href={`/empezar?n=${encodeURIComponent(b.name)}`}>Elegir mi plan</a>
                <a className="btn btn-ghost" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Terminó mi prueba de FiveTap y quiero elegir mi plan.`)}>Hablar con FiveTap</a>
              </div>
            ) : unpaid ? (
              <>
                <p><b>Paga y se reactiva todo el mismo día.</b> En cuanto registramos tu pago, tus placas y esta app vuelven a funcionar solas.</p>
                <div className="row">
                  <a className="btn btn-dark" href={`/pagar?n=${encodeURIComponent(b.name)}`}>Ver cómo pagar</a>
                  <a className="btn btn-ghost" href={help}>Ya pagué · avisar por WhatsApp</a>
                </div>
                <Link href={`/mi/${token}/pagos`} style={{ textDecoration: "underline" }}>Ver mi facturación y mis pagos</Link>
              </>
            ) : (
              <div className="row">
                <a className="btn btn-dark" href={help}>Escribir a FiveTap</a>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
