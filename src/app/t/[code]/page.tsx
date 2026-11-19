import { publicStaff } from "@/lib/staff";
import { programFor } from "@/lib/loyalty-cards";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { GuestCard } from "@/components/GuestCard";
import { GuestExperience } from "@/components/GuestExperience";
import { publishedExperience } from "@/lib/experience";
import { hasContent } from "@/lib/experience-shape";
import { moduleOn } from "@/lib/orders";
import { accessOf } from "@/lib/entitlements";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/admin-session";
import { guestClosed, logEvent, reviewUrlFor, tagByCode } from "@/lib/data";
import { PIECE_LABEL, pieceState } from "@/lib/pieces";
import { guestRequest, sourceFrom } from "./request";
import { Inactive } from "./Inactive";
import { Unavailable } from "./Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ s?: string; preview?: string }> };

export default async function TapPage({ params, searchParams }: Props) {
  const [{ code }, sp, req, jar] = await Promise.all([params, searchParams, guestRequest(), cookies()]);
  const [tag, founder] = await Promise.all([tagByCode(code), isAdminSession(jar.get(ADMIN_COOKIE)?.value)]);

  // The founder, signed in to the panel, sees which piece this is and is never counted.
  const banner = tag && founder ? (
    <a className="founder-tap" href={`/admin/placas?q=${tag.code}&estado=todas`}>
      <b>Solo tú ves esto</b>
      <span>{tag.business.name} · {tag.label} · {PIECE_LABEL[pieceState(tag)]}{tag.delivered_at ? ` el ${new Date(tag.delivered_at).toLocaleDateString("es-PA", { timeZone: "America/Panama", day: "numeric", month: "short" })}` : ""} · {tag.code}</span>
      <em>Abrir en Placas →</em>
    </a>
  ) : null;

  // A waiter card switched off opens nothing of its old person, even from a saved link.
  if (tag && tag.kind === "waiter" && !tag.active) return <>{banner}<Unavailable copy={req.copy} business={tag.business.name} /></>;
  if (!tag || (await guestClosed(tag))) return <>{banner}<Inactive copy={req.copy} /></>;

  const source = sourceFrom(sp.s);
  // Logged after the response is sent: the guest never waits on the insert.
  if (!req.bot && sp.preview !== "1" && !founder) {
    after(() =>
      logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "scan", source, device: req.device, user_agent: req.ua }),
    );
  }

  // One-time pieces (no plan): the tap goes straight to Google, still counted.
  if (tag.business.mode === "google" && !founder) {
    if (!req.bot && sp.preview !== "1") {
      after(() =>
        logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "review_click", source, device: req.device, user_agent: req.ua }),
      );
    }
    redirect(await reviewUrlFor(tag));
  }

  // A waiter's own card opens that person's rating right away (no need to pick them).
  const acc0 = await accessOf(tag.business);
  if (tag.kind === "waiter" && acc0.has.team && sp.preview !== "1") {
    if (!tag.staff_id) return <>{banner}<Unavailable copy={req.copy} business={tag.business.name} /></>; // unassigned card
    redirect(`/t/${code}/atencion`);
  }

  const q = source === "qr" ? "?s=q" : "";
  const orderHref = moduleOn(tag.business, "orders") ? `/t/${code}/pedir` : undefined;
  const reserveHref = moduleOn(tag.business, "reservations") ? `/t/${code}/reservar` : undefined;
  // A published experience (cover, promotions, catalog…) wraps the same review card.
  const x = await publishedExperience(tag.business_id);
  // Only what the business contracted reaches its page (no tier yet = everything, as before).
  const acc = acc0;
  // "Rate who served you" appears once the business has its team in FiveTap.
  const serviceHref = acc.has.team && (await publicStaff(tag.business_id, tag.branch_id ?? null, Boolean(tag.business.is_demo))).length > 0 ? `/t/${code}/atencion` : undefined;
  const clubHref = acc.has.club ? `/t/${code}/club${q}` : undefined;
  const cardHref = acc.has.loyalty && (await programFor(tag.business_id)).enabled ? `/t/${code}/tarjeta` : undefined;
  if (x) { if (!acc.has.promos) x.promos = []; if (!acc.has.catalog) x.items = []; }
  if (x && hasContent(x.experience, x.promos.length, x.items.length)) {
    return (
      <>
        {banner}
        {tag.business.is_demo && <p className="demo-ribbon">{req.copy.demo}</p>}
        <GuestExperience
          business={tag.business}
          experience={x.experience}
          promos={x.promos}
          items={x.items}
          copy={req.copy}
          lang={req.lang}
          reviewHref={`/t/${code}/go${q}`}
          managerHref={`/t/${code}/mensaje${q}`}
          clubHref={clubHref}
          cardHref={cardHref}
          serviceHref={serviceHref}
          orderHref={orderHref}
          reserveHref={reserveHref}
        />
      </>
    );
  }
  return (
    <>
    {banner}
    {tag.business.is_demo && <p className="demo-ribbon">{req.copy.demo}</p>}
    <GuestCard
      business={tag.business}
      copy={req.copy}
      reviewHref={`/t/${code}/go${q}`}
      managerHref={`/t/${code}/mensaje${q}`}
      clubHref={clubHref}
      cardHref={cardHref}
      serviceHref={serviceHref}
      orderHref={orderHref}
      reserveHref={reserveHref}
    />
    </>
  );
}
