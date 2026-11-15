import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { onColor, safeColor } from "@/lib/brand";
import { todayPanama } from "@/lib/agenda";
import { guestClosed, tagByCode } from "@/lib/data";
import { asExperience, panamaNow, waDigits } from "@/lib/experience-shape";
import { moduleOn } from "@/lib/orders";
import { bookingRules } from "@/lib/reservations";
import { db } from "@/lib/supabase";
import { guestRequest } from "../request";
import { Inactive } from "../Inactive";
import { ReserveForm } from "./ReserveForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> };

/** Booking from a plaque: only the days and times the venue is open. */
export default async function ReservePage({ params, searchParams }: Props) {
  const [{ code }, sp, req] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={req.copy} />;
  if (!moduleOn(tag.business, "reservations")) redirect(`/t/${code}`);
  const [{ hours, settings }, { data }] = await Promise.all([bookingRules(tag.business_id), db().from("businesses").select("experience").eq("id", tag.business_id).maybeSingle()]);
  const wa = waDigits(asExperience(data?.experience ?? null).whatsapp);
  const b = tag.business;
  const brand = safeColor(b.brand_color, "#0a0a0a");
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = (custom ? { "--brand": brand, "--on-brand": onColor(brand) } : {}) as React.CSSProperties;
  const copy = req.copy;
  return (
    <main className="guest gx ob" style={style}>
      <div className="guest-wrap gx-wrap">
        <a className="guest-back" href={`/t/${code}?preview=1`}>← {copy.oBack}</a>
        <div className="ob-head">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={brand} className="biz-logo" />
          <div>
            <h1 className="guest-title" style={{ marginTop: 0 }}>{copy.rTitle}</h1>
            <p className="guest-lead">{b.name} · {copy.rLead}</p>
          </div>
        </div>
        <ReserveForm
          code={code}
          copy={copy}
          lang={req.lang}
          hours={hours}
          settings={settings}
          today={todayPanama()}
          nowMin={panamaNow().min}
          error={sp.error}
          waHref={wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hola, quiero reservar en ${b.name} para un grupo grande.`)}` : null}
        />
      </div>
    </main>
  );
}
