import { receiptByToken, receiptPdfFor } from "@/lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The receipt as a PDF. The link carries the receipt's own secret token, nothing else. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const r = await receiptByToken((await params).token);
  if (!r) return new Response("No encontrado", { status: 404 });
  let pdf: Buffer;
  try {
    pdf = await receiptPdfFor(r);
  } catch (e) {
    console.error("[pdf comprobante]", e);
    return new Response("No se pudo generar el PDF. Inténtalo otra vez.", { status: 500 });
  }
  const download = new URL(req.url).searchParams.get("dl") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Comprobante-${r.number}-FiveTap.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
