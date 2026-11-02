import { downloadPrivate, getContract, provider } from "@/lib/company";
import { contractPdf } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getContract((await params).id);
  if (!c) return new Response("No encontrado", { status: 404 });
  const [p, logoBlob] = await Promise.all([provider(), c.logo_path ? downloadPrivate(c.logo_path) : null]);
  const logo = logoBlob ? Buffer.from(await logoBlob.arrayBuffer()) : null;
  let pdf: Buffer;
  try {
    pdf = await contractPdf(c, p, logo);
  } catch (e) {
    console.error("[pdf contrato]", e);
    return new Response(`No se pudo generar el PDF: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
  const download = new URL(req.url).searchParams.get("dl") === "1";
  const file = `Contrato-${c.number}-${c.venue_name.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // ASCII fallback plus the real (accented) name for browsers that support it.
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Contrato-${c.number}.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "no-store",
    },
  });
}
