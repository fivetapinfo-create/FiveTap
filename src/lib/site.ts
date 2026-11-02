// Public origin. Every NFC tag and QR is written with it, so production must
// set NEXT_PUBLIC_SITE_URL to the final domain. On Vercel the production URL
// is a safe fallback; localhost is only for development.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const siteUrlIsLocal = /localhost|127\.0\.0\.1/.test(SITE_URL);

/** URL written to the NFC chip. Plain, so it never needs to change. */
export const nfcUrl = (code: string) => `${SITE_URL}/t/${code}`;

/** Same destination; the flag only tells the stats it was a QR scan. */
export const qrUrl = (code: string) => `${SITE_URL}/t/${code}?s=q`;

export function salesWhatsAppUrl(text: string): string {
  const phone = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || "").replace(/\D/g, "");
  const q = encodeURIComponent(text);
  return phone ? `https://wa.me/${phone}?text=${q}` : `https://wa.me/?text=${q}`;
}

/** Accepts a Google Place ID or a full review link and returns the review link. */
export function reviewUrlFrom(input: string): string {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(value)}`;
}
