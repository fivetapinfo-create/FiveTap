import { type Agreement, endOf } from "@/lib/agreement";
import { agreementPdfResponse } from "@/lib/agreement-pdf-response";
import { todayPanama } from "@/lib/agenda";
import { planByKey } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A sample 3-month contract to show a prospect (founder only, under /admin). Nothing is
 * saved and no number is used. ?plan=start|pro|enterprise and ?n=<venue> personalize it;
 * ?dl=1 downloads it.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const plan = (await planByKey(sp.get("plan") || "start")) ?? (await planByKey("start"));
  const start = todayPanama();
  const a: Agreement = {
    id: "ejemplo",
    number: "EJEMPLO",
    token: "ejemplo",
    business_id: null,
    venue_name: sp.get("n")?.slice(0, 60) || "Nombre del local",
    venue_address: null,
    signer_name: "Nombre de quien firma",
    signer_role: "Dueño/a",
    plan_name: plan?.name ?? "FiveTap Start",
    monthly_fee: Number(plan?.monthly ?? 129),
    plaques: plan?.plaques ?? 10,
    cards: plan?.cards ?? 2,
    lanyards: plan?.lanyards ?? plan?.cards ?? 2,
    start_date: start,
    end_date: endOf(start),
    payment_method: "Yappy",
    created_at: new Date().toISOString(),
  };
  return agreementPdfResponse(a, req);
}
