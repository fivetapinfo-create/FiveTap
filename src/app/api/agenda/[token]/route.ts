import { timingSafeEqual } from "node:crypto";
import { agenda, calendarToken, todayPanama, toIcs } from "@/lib/agenda";

export const dynamic = "force-dynamic";

// Calendar feed for the founder's phone. Private by the token in the URL,
// since calendar apps can't send a password.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const expected = Buffer.from(calendarToken());
  const given = Buffer.from(token.replace(/\.ics$/, ""));
  if (!process.env.ADMIN_PASSWORD || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Not found", { status: 404 });
  }
  const today = todayPanama();
  const to = new Date(Date.parse(`${today}T12:00:00Z`) + 60 * 86_400_000).toISOString().slice(0, 10);
  const tasks = await agenda(today, to);
  return new Response(toIcs(tasks), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="fivetap.ics"',
      "Cache-Control": "no-store",
    },
  });
}
