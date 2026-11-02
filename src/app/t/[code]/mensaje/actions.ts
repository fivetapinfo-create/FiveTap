"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { insertFeedback, logEvent, markNotified, recentFeedbackCount, tagByCode } from "@/lib/data";
import { notifyFeedback } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { normalizePhone } from "@/lib/phone";
import { guestRequest, sourceFrom } from "../request";

export async function sendFeedback(formData: FormData) {
  const code = String(formData.get("code") || "");
  const q = formData.get("s") === "q" ? "?s=q&" : "?";
  const base = `/t/${code}/mensaje${q}`;

  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") || "")) redirect(`${base}enviado=1`);

  const name = String(formData.get("name") || "").trim().slice(0, 80) || null;
  const message = String(formData.get("message") || "").trim().slice(0, 1500);
  const phone = normalizePhone(String(formData.get("phone") || "").slice(0, 30));
  if (message.length < 3) redirect(`${base}error=corto`);

  const tag = await tagByCode(code);
  if (!tag || !tag.active) redirect(`/t/${code}`);

  const req = await guestRequest();
  let feedbackId: string;
  try {
    ({ id: feedbackId } = await insertFeedback({ business_id: tag.business_id, tag_id: tag.id, name, message, phone }));
  } catch (e) {
    console.error("[feedback]", e);
    redirect(`${base}error=envio`);
  }

  after(async () => {
    // Everything is stored and shown in the panel; only the email is throttled
    // so one table cannot flood the manager's inbox.
    if ((await recentFeedbackCount(tag.id)) <= 5) {
      const via = await notifyFeedback({ business: tag.business, spot: tag.label, name, message, phone });
      const preview = message.length > 140 ? `${message.slice(0, 139)}…` : message;
      const [venue] = await Promise.all([
        sendPush({ role: ["owner", "manager"], businessId: tag.business_id }, { title: `Nuevo mensaje privado · ${tag.label}`, body: `${name ? `${name}: ` : ""}${preview}`, url: `/mi/${tag.business.owner_token}#mensajes` }),
        sendPush({ role: "founder" }, { title: `${tag.business.name}: nuevo mensaje`, body: preview, url: "/admin/mensajes" }),
      ]);
      await markNotified(feedbackId, venue ? [...via, "push"] : via);
    }
    await logEvent({
      business_id: tag.business_id,
      tag_id: tag.id,
      type: "feedback_sent",
      source: sourceFrom(formData.get("s") === "q" ? "q" : undefined),
      device: req.device,
      user_agent: req.ua,
    });
  });

  redirect(`${base}enviado=1`);
}
