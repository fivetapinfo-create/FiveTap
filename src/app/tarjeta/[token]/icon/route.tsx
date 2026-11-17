import { ImageResponse } from "next/og";
import { palette } from "@/lib/brand";
import { cardByToken } from "@/lib/loyalty-cards";

export const dynamic = "force-dynamic";

/** The card's home-screen icon: the venue's logo (or initials) on its brand color. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await cardByToken(token);
  if (!card) return new Response("Not found", { status: 404 });
  const s = [180, 192, 512].includes(Number(new URL(req.url).searchParams.get("s"))) ? Number(new URL(req.url).searchParams.get("s")) : 192;
  const b = card.business;
  const p = palette(b.brand_color, b.brand_accent);
  const bg = p.custom ? p.brand : "#141414";
  const ink = p.custom ? p.onBrand : "#f6f5f1";
  const initials = b.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const logo = b.logo_url && /^https:\/\//.test(b.logo_url) ? b.logo_url : null;
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {logo ? (
          <div style={{ width: s * 0.72, height: s * 0.72, borderRadius: s * 0.16, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" width={s * 0.6} height={s * 0.6} style={{ objectFit: "contain" }} />
          </div>
        ) : (
          <span style={{ fontSize: s * 0.4, fontWeight: 700, color: ink, letterSpacing: -2 }}>{initials}</span>
        )}
      </div>
    ),
    { width: s, height: s, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
