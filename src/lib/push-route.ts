import "server-only";
import { parseSubscription, pushReady, removeSubscription, saveSubscription, sendWelcome, type PushMessage, type PushRole } from "./push";

type Who = { role: PushRole; businessId: string | null; welcome: PushMessage };

/** POST saves this phone for notifications (and sends a first one); DELETE forgets it. */
export async function subscribeHandler(req: Request, who: (role: string | null) => Who | null) {
  if (!pushReady()) return Response.json({ error: "Notificaciones no configuradas." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { subscription?: unknown; role?: string; endpoint?: string } | null;
  if (req.method === "DELETE") {
    if (typeof body?.endpoint === "string") await removeSubscription(body.endpoint);
    return Response.json({ ok: true });
  }
  const sub = parseSubscription(body?.subscription);
  const w = who(body?.role ?? null);
  if (!sub || !w) return Response.json({ error: "Datos inválidos." }, { status: 400 });
  await saveSubscription(sub, w.role, w.businessId);
  await sendWelcome(sub, w.welcome);
  return Response.json({ ok: true });
}
