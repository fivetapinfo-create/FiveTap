import { agreementByToken } from "@/lib/agreements-db";
import { agreementPdfResponse } from "@/lib/agreement-pdf-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The contract sent to the venue: opened only with its own secret link. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const a = await agreementByToken((await params).token);
  return a ? agreementPdfResponse(a, req) : new Response("No encontrado", { status: 404 });
}
