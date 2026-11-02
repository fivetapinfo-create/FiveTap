import type { MetadataRoute } from "next";

/** Web app manifest: what makes a page installable as the FiveTap app. */
export function manifest(m: { id: string; name: string; start: string; scope: string; icon?: "panel" | "owner" }) {
  const icon = m.icon === "owner" ? "/icon-owner" : "/icon";
  const body: MetadataRoute.Manifest = {
    id: m.id,
    name: m.name,
    short_name: "FiveTap",
    start_url: m.start,
    scope: m.scope,
    display: "standalone",
    background_color: m.icon === "owner" ? "#ffffff" : "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es",
    icons: [
      { src: `${icon}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${icon}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${icon}-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } });
}
