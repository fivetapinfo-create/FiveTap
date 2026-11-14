import "server-only";

// WhatsApp for receipts. Two ways, never pretending one is the other:
//  · Official WhatsApp Cloud API (Meta), when WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
//    WHATSAPP_RECEIPT_TEMPLATE are set: the message goes out from the panel and Meta answers
//    with a message id ("sent"). The template must be approved in Meta with 4 body variables:
//    {{1}} name, {{2}} receipt number, {{3}} amount, {{4}} receipt link.
//  · Otherwise a wa.me link opens WhatsApp with the text ready; the founder taps Send there,
//    so the panel records it as "opened", not as sent.

export const whatsappApiReady = () =>
  Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_RECEIPT_TEMPLATE);

/** Panamá numbers are saved as digits with the country code (507…). */
export async function sendWhatsAppTemplate(to: string, params: string[]): Promise<{ status: "sent" | "failed"; detail: string }> {
  const token = process.env.WHATSAPP_TOKEN!;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: process.env.WHATSAPP_RECEIPT_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "es" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (res.ok && body.messages?.[0]?.id) return { status: "sent", detail: `Meta aceptó el mensaje (${body.messages[0].id})` };
    return { status: "failed", detail: body.error?.message ?? `WhatsApp respondió ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: e instanceof Error ? e.message : "No se pudo conectar con WhatsApp" };
  }
}
