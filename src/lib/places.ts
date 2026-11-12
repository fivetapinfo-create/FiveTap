import "server-only";

// Google's review count and stars for a venue, read from the Places API (New) with the
// venue's Place ID. Needs GOOGLE_PLACES_API_KEY (Google Cloud, Places API (New) enabled).
// Without it nothing is called and counts are typed by hand in the panel.

export const placesReady = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

export type PlaceRating = { reviews: number; rating: number | null };

export async function fetchPlaceRating(placeId: string): Promise<PlaceRating> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_PLACES_API_KEY para leer las reseñas desde Google.");
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google no respondió (${res.status}). ${detail.slice(0, 160)}`);
  }
  const body = (await res.json()) as { rating?: number; userRatingCount?: number };
  return { reviews: body.userRatingCount ?? 0, rating: typeof body.rating === "number" ? Math.round(body.rating * 10) / 10 : null };
}
