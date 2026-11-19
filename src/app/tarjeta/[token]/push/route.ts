import { cardByToken } from "@/lib/loyalty-cards";
import { subscribeHandler } from "@/lib/push-route";

export const dynamic = "force-dynamic";

// A customer asks for reminders about their own card (close to the reward, reward ready). Voluntary; DELETE turns them off.
async function handle(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await cardByToken(token);
  if (!card) return new Response("Not found", { status: 404 });
  return subscribeHandler(req, () => ({
    role: "customer",
    businessId: card.business_id,
    cardId: card.id,
    welcome: { title: card.business.name, body: "Te avisaremos cuando estés cerca de tu recompensa.", url: `/tarjeta/${token}` },
  }));
}

export const POST = handle;
export const DELETE = handle;
