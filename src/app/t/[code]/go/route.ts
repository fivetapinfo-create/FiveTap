import { NextResponse, after, type NextRequest } from "next/server";
import { deviceFrom, isBot } from "@/lib/device";
import { logEvent, tagByCode } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Counts the review click, then sends the guest straight to Google's review form. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const tag = await tagByCode(code);
  if (!tag || !tag.active) return NextResponse.redirect(new URL(`/t/${code}`, req.url));

  const ua = req.headers.get("user-agent") || "";
  if (!isBot(ua)) {
    const source = req.nextUrl.searchParams.get("s") === "q" ? "qr" : "nfc";
    after(() =>
      logEvent({ business_id: tag.business_id, tag_id: tag.id, type: "review_click", source, device: deviceFrom(ua), user_agent: ua }),
    );
  }
  return NextResponse.redirect(tag.business.google_review_url, 302);
}
