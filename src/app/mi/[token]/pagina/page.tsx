import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { CatalogManager, PromoManager } from "@/components/ExperienceManagers";
import { Logo } from "@/components/Logo";
import { accessRole } from "@/lib/access";
import { todayPanama } from "@/lib/agenda";
import { businessByOwnerToken } from "@/lib/data";
import { experienceEditor } from "@/lib/experience";
import { nfcUrl, salesWhatsAppUrl } from "@/lib/site";
import { db } from "@/lib/supabase";
import { deleteItemOwner, deletePromoOwner, saveItemOwner, savePromoOwner, toggleItemOwner, togglePromoOwner } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: "Mi página · FiveTap", robots: { index: false, follow: false }, manifest: `/mi/${token}/manifest.webmanifest` };
}

const OK: Record<string, string> = {
  promo: "Promoción guardada. Si está activa y en fecha, tus clientes ya la ven al tocar la placa.",
  "promo-borrada": "Promoción eliminada.",
  item: "Guardado. Si está visible, ya aparece en tu página.",
  "item-borrado": "Eliminado.",
  guardado: "Cambios guardados.",
};

/** The owner's NFC page: promotions and catalog they can change themselves, at once. */
export default async function OwnerPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const b = await businessByOwnerToken(token);
  if (!b) notFound();
  if (!(await accessRole(b))) return <AccessGate b={b} token={token} />;
  const [x, tagRes] = await Promise.all([experienceEditor(b.id), db().from("tags").select("code").eq("business_id", b.id).eq("active", true).limit(1)]);
  const tag = (tagRes.data?.[0] as { code: string } | undefined)?.code;
  const hidden = { token };
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
          <h1 className="owner-title">Mi página</h1>
          <p className="muted">Lo que ven tus clientes al acercar el teléfono a tus placas. Lo que cambies aquí se ve al instante.</p>
        </div>
        {sp.ok && OK[sp.ok] && <p className="alert alert-ok" role="status">{OK[sp.ok]}</p>}
        {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
        {!x.published && (
          <p className="alert alert-warn">Tu página completa todavía no está publicada: tus placas muestran la tarjeta de reseña. Puedes ir cargando promociones y productos; FiveTap la publica contigo. <a href={salesWhatsAppUrl(`Hola, soy de ${b.name}. Quiero publicar mi página FiveTap.`)} style={{ textDecoration: "underline" }}>Escríbenos</a>.</p>
        )}
        {tag && <a className="btn btn-ghost btn-sm" href={`${nfcUrl(tag)}?preview=1`} target="_blank" rel="noreferrer" style={{ width: "fit-content" }}>Ver mi página como cliente</a>}

        <section className="panel" id="promos">
          <div className="panel-head"><h2>Promociones</h2></div>
          <PromoManager promos={x.promos} hidden={hidden} today={todayPanama()} actions={{ save: savePromoOwner, remove: deletePromoOwner, toggle: togglePromoOwner }} />
        </section>
        <section className="panel" id="catalogo">
          <div className="panel-head"><h2>{x.draft.catalog_title || "Productos y servicios"}</h2></div>
          <CatalogManager items={x.items} hidden={hidden} actions={{ save: saveItemOwner, remove: deleteItemOwner, toggle: toggleItemOwner }} />
        </section>
        <p className="muted owner-note">¿Quieres cambiar la portada, el horario, la ubicación o tus redes? Escríbele a FiveTap y lo actualizamos.</p>
      </main>
    </div>
  );
}
