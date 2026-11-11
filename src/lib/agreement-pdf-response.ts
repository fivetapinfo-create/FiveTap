import "server-only";
import type { Agreement } from "./agreement";
import { provider } from "./company";
import { agreementPdf } from "./pdf/documents";

/** The contract as a PDF response (inline to preview, or ?dl=1 to download). */
export async function agreementPdfResponse(a: Agreement, req: Request) {
  let pdf: Buffer;
  try {
    pdf = await agreementPdf(a, await provider());
  } catch (e) {
    console.error("[pdf contrato]", e);
    return new Response("No se pudo generar el PDF. Inténtalo otra vez.", { status: 500 });
  }
  const download = new URL(req.url).searchParams.get("dl") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Contrato-${a.number}-FiveTap.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
