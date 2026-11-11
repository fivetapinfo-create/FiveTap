import { normalizePhone } from "@/lib/phone";
import { planByKey } from "@/lib/plans";
import { sendPush } from "@/lib/push";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// The /empezar page registers the venue by itself: before paying it leaves its name
// and WhatsApp, and after PayPal approves the subscription it sends its id.
// The founder gets a notification and a task in the Agenda to create the business.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { subscriptionId?: string; venue?: string; owner?: string; phone?: string; plan?: string } | null;
  const plan = planByKey(body?.plan) ?? planByKey("esencial")!;
  const venue = String(body?.venue ?? "").trim().slice(0, 80);
  const owner = String(body?.owner ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(body?.phone ?? ""));
  const subscription = body?.subscriptionId ? String(body.subscriptionId) : null;
  if (!venue || !owner || !phone) return Response.json({ error: "Escribe el nombre del local, tu nombre y tu WhatsApp." }, { status: 400 });
  if (subscription && !/^I-[A-Z0-9]{6,24}$/.test(subscription)) return Response.json({ error: "Datos inválidos." }, { status: 400 });

  // One sign-up per phone every 10 minutes (double taps, bots).
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db().from("signups").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) > 0 && !subscription) return Response.json({ ok: true });

  const { error } = await db().from("signups").upsert(
    { venue_name: venue, owner_name: owner, phone, plan: plan.key, paypal_subscription_id: subscription },
    { onConflict: "paypal_subscription_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[signup]", error.message);
    return Response.json({ error: "No se pudo guardar. Inténtalo otra vez." }, { status: 500 });
  }
  await sendPush(
    { role: "founder" },
    {
      title: subscription ? `🎉 Nuevo cliente · ${venue}` : `Nuevo registro · ${venue}`,
      body: `${owner} · +${phone}. ${plan.title}: $${plan.monthly} al mes. ${subscription ? "Se suscribió por PayPal." : "Aún sin pagar."} Crea el negocio y coordina la instalación.`,
      url: "/admin/agenda",
    },
  );
  return Response.json({ ok: true });
}
