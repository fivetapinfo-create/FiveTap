import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/admin-session";
import { logEvent, tagByCode } from "@/lib/data";
import ServicePage from "../../t/[code]/atencion/page";
import { guestRequest } from "../../t/[code]/request";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ p?: string }> };

/** A waiter's card (/m/…): its own address, separate from the table plaques (/t/…). Opens that person's service rating. */
export default async function WaiterCardPage(props: Props) {
  const { code } = await props.params;
  const tag = await tagByCode(code);
  if (tag && tag.kind !== "waiter") redirect(`/t/${code}`); // a table plaque opens the venue
  if (tag) {
    const [req, jar] = await Promise.all([guestRequest(), cookies()]);
    if (!req.bot && !req.replay && !(await isAdminSession(jar.get(ADMIN_COOKIE)?.value))) {
      after(() => logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "scan", source: "nfc", device: req.device, user_agent: req.ua }));
    }
  }
  return ServicePage(props);
}
