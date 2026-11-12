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

const writeReview = (placeId: string) => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/**
 * Accepts a Place ID or a link that opens the review window (g.page/r/…/review,
 * writereview?placeid=…) and returns the review link. A Maps link that carries the place
 * ID is turned into the review link; any other Maps or search link only opens the map,
 * so it is refused with what to paste instead.
 */
export function reviewUrlFrom(input: string): string {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(value)) throw new Error("Pega el enlace de reseñas de Google o el Place ID del local (empieza con ChIJ).");
    return writeReview(value);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("El enlace de reseñas no es válido. Cópialo otra vez desde Google.");
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "search.google.com" && url.pathname.includes("writereview")) return value;
  if (host === "g.page" && /\/review\/?$/.test(url.pathname)) return value;
  // A Maps link with the place's ID: build the review link from it.
  const id = url.searchParams.get("query_place_id") || url.searchParams.get("placeid") || /place_id:([A-Za-z0-9_-]{10,})/.exec(decodeURIComponent(value))?.[1];
  if (id) return writeReview(id);
  if (host.endsWith("google.com") || host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.page" || host === "g.co") {
    throw new Error("Ese enlace abre el mapa, no la ventana de reseña. Usa el de Google Business → Pedir reseñas → Copiar enlace (g.page/r/…/review), o el Place ID del local.");
  }
  return value;
}
