import { itemByKey } from "@/lib/catalog";
import { sendPush } from "@/lib/push";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Sent by /pagar right after PayPal captures a one-time payment. The price comes from
// the catalog, never from the browser. The founder still checks it in PayPal.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderId?: string; item?: string; venue?: string; payer?: string } | null;
  const orderId = String(body?.orderId ?? "");
  const item = itemByKey(String(body?.item ?? ""));
  const venue = String(body?.venue ?? "").trim().slice(0, 80);
  const payer = String(body?.payer ?? "").trim().slice(0, 80) || null;
  if (!/^[A-Z0-9]{10,24}$/.test(orderId) || !item || !venue) return Response.json({ error: "Datos inválidos." }, { status: 400 });

  const { error } = await db()
    .from("web_payments")
    .upsert({ paypal_order_id: orderId, item: item.name, amount: item.amount, venue_name: venue, payer_name: payer }, { onConflict: "paypal_order_id", ignoreDuplicates: true });
  if (error) {
    console.error("[compra]", error.message);
    return Response.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  await sendPush(
    { role: "founder" },
    { title: `💵 Pago recibido · $${item.amount.toLocaleString("en-US")} · ${venue}`, body: `${item.name} por PayPal (pedido ${orderId}). Verifícalo en PayPal y regístralo en el negocio.`, url: "/admin/agenda" },
  );
  return Response.json({ ok: true });
}
