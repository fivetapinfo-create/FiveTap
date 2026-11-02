export type Device = "ios" | "android" | "other";

export function deviceFrom(ua: string): Device {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

// Link previews (WhatsApp, Instagram, iMessage) and crawlers fetch the page
// too; counting them would inflate the numbers we show the owner.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|embedly|curl|wget|python|headless|lighthouse/i;

export const isBot = (ua: string) => !ua || BOT.test(ua);
