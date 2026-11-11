import "server-only";

// Transactional email through Resend (free plan: 3,000 emails a month). Needs
// RESEND_API_KEY and EMAIL_FROM (e.g. "FiveTap <pagos@getfivetap.com>", on a domain
// verified in Resend). Without them nothing is sent and the caller is told so.

export const emailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export type EmailResult = { status: "sent" | "failed" | "skipped"; detail: string };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  /** Same key = same email: Resend drops a repeat within 24 hours. */
  idempotencyKey?: string;
}): Promise<EmailResult> {
  if (!emailReady()) return { status: "skipped", detail: "El correo no está configurado (RESEND_API_KEY y EMAIL_FROM)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { status: "sent", detail: body.id ?? "ok" } : { status: "failed", detail: body.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: e instanceof Error ? e.message : String(e) };
  }
}
