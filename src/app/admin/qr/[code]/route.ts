import QRCode from "qrcode";
import { type NextRequest } from "next/server";
import { qrUrl } from "@/lib/site";

const OPTS = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#0b0b0fff", light: "#ffffffff" } } as const;

/** QR for one tag. SVG for the print shop (scales without blur), PNG for WhatsApp. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9]{4,16}$/.test(code)) return new Response("Código inválido", { status: 400 });
  const url = qrUrl(code);

  if (req.nextUrl.searchParams.get("format") === "png") {
    const png = await QRCode.toBuffer(url, { ...OPTS, type: "png", width: 1200 });
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="fivetap-${code}.png"` },
    });
  }
  const svg = await QRCode.toString(url, { ...OPTS, type: "svg" });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="fivetap-${code}.svg"` },
  });
}
