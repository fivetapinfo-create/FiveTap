import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "@/components/Icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { onColor, safeColor } from "@/lib/brand";
import { tagByCode } from "@/lib/data";
import { COPY } from "@/lib/i18n";
import { reservationByToken } from "@/lib/reservations";
import { guestRequest } from "../../request";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ code: string; token: string }>; searchParams: Promise<{ l?: string }> };

/** The guest's reservation and whether the venue has confirmed it. Refreshes by itself while pending. */
export default async function ReservationStatusPage({ params, searchParams }: Props) {
  const [{ code, token }, sp, req] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag) notFound();
  const r = await reservationByToken(tag.business_id, token);
  if (!r) notFound();
  const lang = sp.l === "en" || sp.l === "es" ? sp.l : req.lang;
  const copy = COPY[lang];
  const brand = safeColor(tag.business.brand_color, "#0a0a0a");
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = (custom ? { "--brand": brand, "--on-brand": onColor(brand) } : {}) as React.CSSProperties;
  const day = new Date(`${r.reserved_on}T12:00:00Z`).toLocaleDateString(lang === "es" ? "es-PA" : "en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const h = Number(r.reserved_at.slice(0, 2));
  const time = `${h % 12 || 12}:${r.reserved_at.slice(3)} ${h >= 12 ? (lang === "es" ? "p. m." : "PM") : lang === "es" ? "a. m." : "AM"}`;
  const bad = r.status === "canceled" || r.status === "no_show";
  return (
    <main className="guest gx ob" style={style}>
      {r.status === "pending" && <LiveRefresh seconds={30} />}
      <div className="guest-wrap gx-wrap">
        <div className="ob-done">
          <div className={`check-badge rise${bad ? " ob-canceled" : ""}`}><Check /></div>
          <p className="guest-name rise" style={{ "--i": 1 } as React.CSSProperties}>{tag.business.name}</p>
          <h1 className="guest-title rise" style={{ "--i": 2 } as React.CSSProperties}>{copy.rYour}: {copy.rStatus[r.status]}</h1>
          <p className="guest-lead rise" style={{ "--i": 3 } as React.CSSProperties}>{copy.rStatusHint[r.status]}</p>
        </div>
        <div className="gx-card rv-card">
          <b className="rv-when">{copy.rWhen.replace("{day}", day).replace("{time}", time)}</b>
          <span>{r.party_size === 1 ? copy.rPerson : copy.rPeople.replace("{n}", String(r.party_size))} · {r.customer_name}</span>
          {r.notes && <span className="muted">“{r.notes}”</span>}
        </div>
        <a className="guest-back" href={`/t/${code}?preview=1`} style={{ justifyContent: "center", marginTop: 16 }}>← {copy.oBack}</a>
      </div>
    </main>
  );
}
