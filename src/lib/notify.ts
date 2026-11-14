import "server-only";
import type { Business } from "./types";

// Private feedback is always stored and shown in the panel inbox (that is the
// internal notification). Email is optional: it turns on when RESEND_API_KEY
// and EMAIL_FROM are set. Add a channel later by adding one entry to CHANNELS.

export type FeedbackAlert = {
  business: Pick<Business, "name" | "manager_email">;
  spot: string | null;
  name: string | null;
  message: string;
  phone: string | null;
  rating?: number | null;
};

type Channel = {
  id: "email";
  enabled: (a: FeedbackAlert) => boolean;
  send: (a: FeedbackAlert) => Promise<void>;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const email: Channel = {
  id: "email",
  enabled: (a) =>
    Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && (a.business.manager_email || process.env.FOUNDER_EMAIL)),
  async send(a) {
    const to = [...new Set([a.business.manager_email, process.env.FOUNDER_EMAIL].filter(Boolean) as string[])];
    const where = a.spot ? ` · ${a.spot}` : "";
    const who = `${a.name || "Cliente (sin nombre)"}${a.rating ? ` · ${"★".repeat(a.rating)}${"☆".repeat(5 - a.rating)} (${a.rating}/5)` : ""}`;
    const wa = a.phone ? `https://wa.me/${a.phone}` : null;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: `Mensaje privado — ${a.business.name}${where}`,
        text: `${who}${where}\n\n${a.message}\n\n${wa ? `Responder por WhatsApp: ${wa}\n\n` : ""}Responde rápido: el cliente puede seguir en el local.\n— FiveTap`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;color:#0a0a0a">
<p style="color:#5c5b57;font-size:13px;margin:0 0 6px">${escapeHtml(a.business.name)}${escapeHtml(where)}</p>
<p style="font-size:16px;font-weight:600;margin:0 0 12px">${escapeHtml(who)}</p>
<p style="font-size:16px;line-height:1.5;white-space:pre-wrap;margin:0 0 20px">${escapeHtml(a.message)}</p>
${wa ? `<p style="margin:0 0 20px"><a href="${wa}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px">Responder por WhatsApp</a></p>` : ""}
<p style="color:#8a8984;font-size:12px;margin:0">Responde rápido: el cliente puede seguir en el local. — FiveTap</p></div>`,
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status} ${await res.text().catch(() => "")}`);
  },
};

const CHANNELS: Channel[] = [email];

/** Sends on every enabled channel; returns the ids that succeeded. Never throws. */
export async function notifyFeedback(alert: FeedbackAlert): Promise<string[]> {
  const active = CHANNELS.filter((c) => c.enabled(alert));
  const results = await Promise.allSettled(active.map((c) => c.send(alert)));
  const sent: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") sent.push(active[i]!.id);
    else console.error(`[notify:${active[i]!.id}]`, r.reason);
  });
  return sent;
}
