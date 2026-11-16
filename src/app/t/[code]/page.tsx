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
import { guestClosed, logEvent, tagByCode } from "@/lib/data";
import { PIECE_LABEL, pieceState } from "@/lib/pieces";
import { guestRequest, sourceFrom } from "./request";
import { Inactive } from "./Inactive";

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
    redirect(tag.business.google_review_url);
  }

  const q = source === "qr" ? "?s=q" : "";
  const orderHref = moduleOn(tag.business, "orders") ? `/t/${code}/pedir` : undefined;
  const reserveHref = moduleOn(tag.business, "reservations") ? `/t/${code}/reservar` : undefined;
  // A published experience (cover, promotions, catalog…) wraps the same review card.
  const x = await publishedExperience(tag.business_id);
  // Only what the business contracted reaches its page (no tier yet = everything, as before).
  const acc = await accessOf(tag.business);
  const clubHref = acc.has.club ? `/t/${code}/club${q}` : undefined;
  if (x) { if (!acc.has.promos) x.promos = []; if (!acc.has.catalog) x.items = []; }
  if (x && hasContent(x.experience, x.promos.length, x.items.length)) {
    return (
      <>
        {banner}
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
          orderHref={orderHref}
          reserveHref={reserveHref}
        />
      </>
    );
  }
  return (
    <>
    {banner}
    <GuestCard
      business={tag.business}
      copy={req.copy}
      reviewHref={`/t/${code}/go${q}`}
      managerHref={`/t/${code}/mensaje${q}`}
      clubHref={clubHref}
      orderHref={orderHref}
          reserveHref={reserveHref}
    />
    </>
  );
}
