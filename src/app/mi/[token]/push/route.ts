import { businessByOwnerToken } from "@/lib/data";
import { subscribeHandler } from "@/lib/push-route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

// Phones of the venue: the owner (also gets payment reminders) or the manager.
async function handle(req: Request, { params }: Ctx) {
  const { token } = await params;
  const b = await businessByOwnerToken(token);
  if (!b) return new Response("Not found", { status: 404 });
  return subscribeHandler(req, (role) => ({
    role: role === "manager" ? "manager" : "owner",
    businessId: b.id,
    welcome: { title: `FiveTap · ${b.name}`, body: "¡Listo! Las notificaciones de FiveTap están activas en este celular. 🎉", url: `/mi/${token}` },
  }));
}

export const POST = handle;
export const DELETE = handle;
