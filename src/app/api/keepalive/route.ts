import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Supabase's free plan pauses a project after a week without activity, which
// would take every placa offline. A daily Vercel cron runs one tiny query.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const { error } = await db().from("businesses").select("id", { head: true, count: "exact" });
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
