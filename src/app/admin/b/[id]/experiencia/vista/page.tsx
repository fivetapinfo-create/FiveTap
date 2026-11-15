import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { GuestCard } from "@/components/GuestCard";
import { GuestExperience } from "@/components/GuestExperience";
import { todayPanama } from "@/lib/agenda";
import { experienceEditor } from "@/lib/experience";
import { hasContent, promoLive } from "@/lib/experience-shape";
import { COPY, langFrom } from "@/lib/i18n";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ marco?: string }> };

/** Founder preview of the draft, exactly as a guest would see it. Nothing is counted. */
export default async function ExperiencePreview({ params, searchParams }: Props) {
  const [{ id }, sp, h] = await Promise.all([params, searchParams, headers()]);
  const { data: b } = await db().from("businesses").select("name, logo_url, brand_color").eq("id", id).maybeSingle();
  if (!b) notFound();
  const x = await experienceEditor(id);
  const lang = langFrom(h.get("accept-language"));
  const copy = COPY[lang];
  const today = todayPanama();
  const promos = x.promos.filter((p) => promoLive(p, today));
  const items = x.items.filter((i) => i.active);
  return (
    <div className={`gx-preview${sp.marco === "1" ? " in-frame" : ""}`}>
      {sp.marco !== "1" && <p className="gx-preview-bar">Vista previa del borrador · así lo verán sus clientes al publicarlo</p>}
      {hasContent(x.draft, promos.length, items.length) ? (
        <GuestExperience business={b} experience={x.draft} promos={promos} items={items} copy={copy} lang={lang} reviewHref="#" managerHref="#" clubHref="#" preview />
      ) : (
        <GuestCard business={b} copy={copy} reviewHref="#" managerHref="#" clubHref="#" />
      )}
    </div>
  );
}
