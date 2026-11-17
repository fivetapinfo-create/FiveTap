import { cardByToken } from "@/lib/loyalty-cards";
import { palette } from "@/lib/brand";

export const dynamic = "force-dynamic";

/** Lets the customer install their card as its own icon, in the venue's colors. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await cardByToken(token);
  if (!card) return new Response("Not found", { status: 404 });
  const p = palette(card.business.brand_color, card.business.brand_accent);
  const bg = p.custom ? p.brand : "#141414";
  return Response.json(
    {
      name: `${card.business.name} · Tarjeta`,
      short_name: card.business.name.slice(0, 12),
      start_url: `/tarjeta/${token}`,
      scope: `/tarjeta/${token}`,
      display: "standalone",
      background_color: bg,
      theme_color: bg,
      icons: [192, 512].map((s) => ({ src: `/tarjeta/${token}/icon?s=${s}`, sizes: `${s}x${s}`, type: "image/png", purpose: "any" })),
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } },
  );
}
