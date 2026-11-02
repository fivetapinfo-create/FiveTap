import "server-only";
import { headers } from "next/headers";
import { deviceFrom, isBot } from "@/lib/device";
import { COPY, langFrom } from "@/lib/i18n";

export async function guestRequest() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const lang = langFrom(h.get("accept-language"));
  return { ua, bot: isBot(ua), device: deviceFrom(ua), copy: COPY[lang], lang };
}

export const sourceFrom = (s: string | string[] | undefined) => (s === "q" ? "qr" : "nfc") as "qr" | "nfc";
