import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// Sent by the /prueba page right after someone starts a free trial on PayPal,
// so the founder knows at once and can bring the trial plaque.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { subscriptionId?: string; plan?: string; business?: string } | null;
  const id = String(body?.subscriptionId ?? "");
  if (!/^I-[A-Z0-9]{6,24}$/.test(id)) return Response.json({ error: "Datos inválidos." }, { status: 400 });
  const plan = body?.plan === "anual" ? "plan anual" : "plan mensual";
  const who = String(body?.business ?? "").trim().slice(0, 80);
  await sendPush(
    { role: "founder" },
    { title: `🎉 Nueva prueba gratis${who ? ` · ${who}` : ""}`, body: `Se registró en PayPal (${plan}). Suscripción ${id}. Coordina su placa de prueba.`, url: "/admin/agenda" },
  );
  return Response.json({ ok: true });
}
