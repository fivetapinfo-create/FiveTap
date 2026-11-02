import { businessDetail, contactsFor } from "@/lib/data";
import { contactsCsv } from "@/lib/contacts-csv";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, contacts] = await Promise.all([businessDetail(id), contactsFor(id)]);
  if (!d) return new Response("No encontrado", { status: 404 });
  return contactsCsv(contacts, d.tags, `club-${d.business.slug}.csv`);
}
