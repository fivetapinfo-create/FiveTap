"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { agreementByToken } from "@/lib/agreements-db";
import { audit } from "@/lib/receipts";
import { sendPush } from "@/lib/push";
import { sign } from "@/lib/signatures";

/** The venue signs its contract electronically from the link FiveTap sent. */
export async function signContract(f: FormData) {
  const token = String(f.get("token") ?? "");
  const a = await agreementByToken(token);
  if (!a) redirect("/");
  const back = `/contrato/${token}`;
  let error = "";
  try {
    if (f.get("read") !== "1" || f.get("esign") !== "1") throw new Error("Marca las dos casillas para firmar.");
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip");
    await sign(a, "client", { name: String(f.get("name") ?? ""), role: String(f.get("role") ?? ""), png: String(f.get("signature") ?? ""), ip, ua: h.get("user-agent") });
    await audit("agreement.signed", { businessId: a.business_id, entity: "agreement", entityId: a.id, details: { party: "client", name: String(f.get("name") ?? "").slice(0, 120) } });
    await sendPush({ role: "founder" }, { title: `✍️ Contrato firmado · ${a.venue_name}`, body: `${a.number}: firmado por el cliente. Fírmalo tú para cerrarlo.`, url: "/admin/contratos" }).catch(() => 0);
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo firmar.";
  }
  redirect(error ? `${back}?error=${encodeURIComponent(error)}#firmar` : `${back}?ok=firmado#firmas`);
}
