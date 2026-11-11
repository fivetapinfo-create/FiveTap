import { agreementById } from "@/lib/agreements-db";
import { agreementPdfResponse } from "@/lib/agreement-pdf-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await agreementById((await params).id);
  return a ? agreementPdfResponse(a, req) : new Response("No encontrado", { status: 404 });
}
