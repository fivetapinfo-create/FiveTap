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
 * Google's own "ask for reviews" link (g.page/r/…/review), the one an owner copies from
 * Google Business. It opens the review window directly, also in the Maps app. A
 * classic Place ID ("ChIJ…") carries the venue's internal number, which is all that link
 * needs; other IDs fall back to the plain review link.
 */
function officialReview(placeId: string) {
  try {
    const bin = atob(placeId.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(placeId.length / 4) * 4, "="));
    const bytes = Array.from(bin, (c) => c.charCodeAt(0));
    if (bytes.length === 20 && bytes[0] === 0x0a && bytes[1] === 0x12 && bytes[2] === 0x09 && bytes[11] === 0x11) {
      const id = btoa(String.fromCharCode(0x09, ...bytes.slice(12, 20), 0x10, 0x01)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `https://g.page/r/${id}/review`;
    }
  } catch {
    // Not a classic Place ID: use the plain review link.
  }
  return writeReview(placeId);
}

/** The Place ID inside a pasted value (bare "ChIJ…", writereview?placeid=…, a Maps link), if any. */
export function placeIdFrom(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
  try {
    const url = new URL(value);
    return url.searchParams.get("placeid") || url.searchParams.get("query_place_id") || /place_id:([A-Za-z0-9_-]{20,})/.exec(decodeURIComponent(value))?.[1] || null;
  } catch {
    return null;
  }
}

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
    return officialReview(value);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("El enlace de reseñas no es válido. Cópialo otra vez desde Google.");
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "search.google.com" && url.pathname.includes("writereview")) {
    const pid = url.searchParams.get("placeid");
    return pid ? officialReview(pid) : value;
  }
  if (host === "g.page" && /\/review\/?$/.test(url.pathname)) return value;
  // A Maps link with the place's ID: build the review link from it.
  const id = url.searchParams.get("query_place_id") || url.searchParams.get("placeid") || /place_id:([A-Za-z0-9_-]{10,})/.exec(decodeURIComponent(value))?.[1];
  if (id) return officialReview(id);
  if (host.endsWith("google.com") || host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.page" || host === "g.co") {
    throw new Error("Ese enlace abre el mapa, no la ventana de reseña. Usa el de Google Business → Pedir reseñas → Copiar enlace (g.page/r/…/review), o el Place ID del local.");
  }
  return value;
}
