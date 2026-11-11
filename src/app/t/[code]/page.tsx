import type { Metadata } from "next";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { GuestCard } from "@/components/GuestCard";
import { guestClosed, logEvent, tagByCode } from "@/lib/data";
import { guestRequest, sourceFrom } from "./request";
import { Inactive } from "./Inactive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ s?: string; preview?: string }> };

export default async function TapPage({ params, searchParams }: Props) {
  const [{ code }, sp, req] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);

  if (!tag || (await guestClosed(tag))) return <Inactive copy={req.copy} />;

  const source = sourceFrom(sp.s);
  // Logged after the response is sent: the guest never waits on the insert.
  if (!req.bot && sp.preview !== "1") {
    after(() =>
      logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "scan", source, device: req.device, user_agent: req.ua }),
    );
  }

  // One-time pieces (no plan): the tap goes straight to Google, still counted.
  if (tag.business.mode === "google") {
    if (!req.bot && sp.preview !== "1") {
      after(() =>
        logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "review_click", source, device: req.device, user_agent: req.ua }),
      );
    }
    redirect(tag.business.google_review_url);
  }

  const q = source === "qr" ? "?s=q" : "";
  return (
    <GuestCard
      business={tag.business}
      copy={req.copy}
      reviewHref={`/t/${code}/go${q}`}
      managerHref={`/t/${code}/mensaje${q}`}
      clubHref={`/t/${code}/club${q}`}
    />
  );
}
