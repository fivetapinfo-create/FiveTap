import { billingState } from "@/lib/agenda";
import { businessByOwnerToken, businessDetail, contactsFor } from "@/lib/data";
import { contactsCsv } from "@/lib/contacts-csv";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const b = await businessByOwnerToken((await params).token);
  if (!b) return new Response("No encontrado", { status: 404 });
  const [d, contacts] = await Promise.all([businessDetail(b.id), contactsFor(b.id)]);
  const billing = billingState(b, d?.payments ?? []);
  if (billing.kind === "suspended" || billing.kind === "paused") return new Response("Servicio pausado: ponte al día con tu pago para descargar tu club.", { status: 403 });
  return contactsCsv(contacts, d?.tags ?? [], `club-${b.slug}.csv`);
}
