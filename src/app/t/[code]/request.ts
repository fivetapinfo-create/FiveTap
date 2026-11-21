import "server-only";
import { headers } from "next/headers";
import { deviceFrom, isBot } from "@/lib/device";
import { COPY, langFrom } from "@/lib/i18n";

export async function guestRequest() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const lang = langFrom(h.get("accept-language"));
  // A page re-rendered after a form action (the guest sent a rating) or prefetched by the
  // browser is not a new tap: it must not be counted again.
  const replay = Boolean(h.get("next-action") || h.get("next-router-prefetch") || h.get("purpose") === "prefetch");
  return { ua, bot: isBot(ua), device: deviceFrom(ua), copy: COPY[lang], lang, replay };
}

// FiveTap works only with NFC. Old "?s=q" links still open, counted as NFC.
export const sourceFrom = (_s: string | string[] | undefined) => "nfc" as "qr" | "nfc";
