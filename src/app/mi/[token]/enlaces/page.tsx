import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { LinksHub } from "@/components/LinksHub";
import { Logo } from "@/components/Logo";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { linkGroups } from "@/lib/links";
import { salesWhatsAppUrl } from "@/lib/site";
import { db } from "@/lib/supabase";
import { isWaiterTag } from "@/lib/team";
import type { Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Mis enlaces · Fivetap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

/** Every link of the business (reviews, tables, waiters, the app), to copy or send by WhatsApp without asking anyone. */
export default async function LinksPage({ params }: Props) {
  const { token } = await params;
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  const role = await accessRole(b);
  if (!role) return <AccessGate b={b} token={token} />;
  // Only this business's pieces, and only the active ones (a switched-off piece is not shared).
  const { data } = await db().from("tags").select("id, label, code, kind, active, staff_id, staff_name").eq("business_id", b.id).eq("active", true).order("created_at");
  const pieces = (data ?? []) as Pick<Tag, "id" | "label" | "code" | "kind" | "active" | "staff_id" | "staff_name">[];
  const home = `/mi/${token}`;
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link href={home} className="owner-back" aria-label="Volver a mi resumen">← Volver</Link>
          <Logo size={20} />
        </div>
      </header>
      <main className="container admin-main settings">
        <div>
          <h1 className="owner-title">Mis enlaces</h1>
          <p className="muted">Cópialos o envíalos por WhatsApp: reseñas, mesas, meseros y la app para tu gerente.</p>
        </div>
        <section className="panel">
          <LinksHub groups={linkGroups(b, pieces, { ownerApp: role === "owner", isWaiter: (p) => isWaiterTag(p as Pick<Tag, "kind" | "label">) })} />
        </section>
        <p className="muted" style={{ fontSize: 13 }}>
          ¿Necesitas más placas o tarjetas? <a className="link-u" href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Necesito más placas o tarjetas de Fivetap.`)}>Escríbenos</a> y te las preparamos con su enlace. Los meseros nuevos los agregas en <Link className="link-u" href={`${home}/equipo`}>Equipo</Link>.
        </p>
      </main>
    </div>
  );
}
