import { BusinessLogo } from "@/components/BusinessLogo";
import { palette } from "@/lib/brand";
import { LOYALTY, yearlySaving, type LoyaltyStatus } from "@/lib/loyalty";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const monthYear = (iso: string) => new Intl.DateTimeFormat("es-PA", { month: "long", year: "numeric", timeZone: "America/Panama" }).format(new Date(iso));

/**
 * The client's FiveTap membership card, in the colors of their own business: how long they have
 * been with FiveTap and how close the loyalty reward is (a year of payments → 3 months with discount).
 */
export function MemberCard({ b, since, status, fee }: {
  b: { name: string; logo_url: string | null; brand_color: string | null; brand_accent?: string | null };
  since: string;
  status: LoyaltyStatus;
  fee: number;
}) {
  const p = palette(b.brand_color, b.brand_accent);
  const inYear = status.active ? LOYALTY.afterMonths : LOYALTY.afterMonths - status.monthsToGo;
  const style = { "--mc-bg": p.custom ? p.brand : "#141414", "--mc-ink": p.custom ? p.onBrand : "#f6f5f1", "--mc-accent": p.custom ? p.accentSoft : "#c9ced6" } as React.CSSProperties;
  return (
    <section className="mc" style={style} aria-label="Tu tarjeta de socio FiveTap">
      <div className="mc-top">
        <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color ?? "#0a0a0a"} className="mc-logo" />
        <div className="mc-id"><b>{b.name}</b><small>Socio FiveTap desde {monthYear(since)}</small></div>
        <span className="mc-tag">{status.years >= 1 ? `${status.years} ${status.years === 1 ? "año" : "años"}` : "Socio"}</span>
      </div>
      {status.active ? (
        <div className="mc-reward">
          <b>Premio de lealtad activo</b>
          <span>Tu mensualidad {status.active.n} de {status.active.of} lleva {status.active.pct}% menos: {money(fee - status.active.saved)} en vez de {money(fee)}.</span>
        </div>
      ) : (
        <div className="mc-reward">
          <b>{status.monthsToGo === 1 ? "Te falta 1 mes para tu premio" : `Te faltan ${status.monthsToGo} meses para tu premio`}</b>
          <span>Al cumplir {status.years >= 1 ? "otro año" : "un año"} con FiveTap, tus siguientes {LOYALTY.months} mensualidades llevan {LOYALTY.pct}% menos ({money(fee)} → {money(Math.round(fee * (100 - LOYALTY.pct)) / 100)}). Ahorras {money(yearlySaving(fee))}.</span>
        </div>
      )}
      <ol className="mc-dots" aria-label={`${inYear} de ${LOYALTY.afterMonths} meses`}>
        {Array.from({ length: LOYALTY.afterMonths }, (_, i) => <li key={i} className={i < inYear ? "on" : undefined} />)}
      </ol>
    </section>
  );
}
