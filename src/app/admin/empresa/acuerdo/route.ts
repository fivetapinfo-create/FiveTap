import { getCompany, listFounders } from "@/lib/company";
import { founderAgreementPdf } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [c, founders] = await Promise.all([getCompany(), listFounders()]);
  if (founders.length === 0) return new Response("Agrega primero al fundador.", { status: 400 });
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  let pdf: Buffer;
  try {
    pdf = await founderAgreementPdf(c, founders, today);
  } catch (e) {
    console.error("[pdf acuerdo]", e);
    return new Response(`No se pudo generar el PDF: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Acuerdo-de-fundadores.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
