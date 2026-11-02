import { businessByOwnerToken, businessDetail, contactsFor } from "@/lib/data";
import { contactsCsv } from "@/lib/contacts-csv";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const b = await businessByOwnerToken((await params).token);
  if (!b) return new Response("No encontrado", { status: 404 });
  const [d, contacts] = await Promise.all([businessDetail(b.id), contactsFor(b.id)]);
  return contactsCsv(contacts, d?.tags ?? [], `club-${b.slug}.csv`);
}
