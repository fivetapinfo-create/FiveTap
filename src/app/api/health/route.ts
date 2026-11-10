import { pushReady } from "@/lib/push";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Quick status for uptime checks: is the database answering, and are notifications set up.
// Reveals nothing private.
export async function GET() {
  const started = Date.now();
  const { error } = await db().from("businesses").select("id", { head: true, count: "exact" });
  const body = { ok: !error, database: error ? "error" : "ok", notifications: pushReady() ? "ok" : "off", ms: Date.now() - started };
  return Response.json(body, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
