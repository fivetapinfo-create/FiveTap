import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogManager, PromoManager } from "@/components/ExperienceManagers";
import { ImageInput } from "@/components/ImageInput";
import { SubmitButton } from "@/components/SubmitButton";
import { todayPanama } from "@/lib/agenda";
import { experienceEditor } from "@/lib/experience";
import { db } from "@/lib/supabase";
import { nfcUrl } from "@/lib/site";
import { MODULES, moduleOn, moduleSource, type ModuleKey } from "@/lib/orders";
import {
  deleteItemAdmin, deletePromoAdmin, publishExperienceAction, saveExperienceDraft, saveItemAdmin, savePromoAdmin,
  setModuleAdmin, toggleItemAdmin, togglePromoAdmin, unpublishExperienceAction,
} from "../../../actions";
import { Flash } from "../../../Flash";
import { dateTime } from "../../../format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const SECTIONS = [
  ["promos", "Promociones"],
  ["catalog", "Productos y servicios"],
  ["gallery", "Fotos"],
  ["info", "Información y horario"],
  ["location", "Ubicación"],
  ["contact", "Contacto y redes"],
] as const;

/**
 * The business's NFC experience: what its plaques open. The founder edits a draft, checks
 * it in the preview and publishes it; promotions and products go live as soon as they are
 * active. The review card is always there, the same for every guest.
 */
export default async function ExperiencePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { data: b } = await db().from("businesses").select("id, name, logo_url, brand_color, modules, plan_key").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [x, tagRes] = await Promise.all([experienceEditor(id), db().from("tags").select("code").eq("business_id", id).eq("active", true).limit(1)]);
  const d = x.draft;
  const tag = (tagRes.data?.[0] as { code: string } | undefined)?.code;
  const hidden = { business_id: id };
  const today = todayPanama();
  const status = !x.published ? { cls: "paused", label: "Sin publicar", text: "Sus placas muestran la tarjeta de reseña simple." }
    : x.pending ? { cls: "trial", label: "Publicada · con cambios sin publicar", text: `Publicada el ${dateTime(x.publishedAt ?? "")} · Tienes cambios en el borrador sin publicar.` }
    : { cls: "active", label: "Publicada", text: `Desde el ${dateTime(x.publishedAt ?? "")} · Promociones y productos se actualizan al instante.` };

  return (
    <main className="container admin-main xp">
      <div>
        <Link className="crumb" href={`/admin/b/${id}`}>← {b.name}</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>Experiencia NFC</h1>
            <p>Lo que ven sus clientes al acercar el teléfono a cualquiera de sus placas. Sin regrabar nada: los cambios llegan solos.</p>
          </div>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="xp-layout">
        <div className="xp-main">
          <section className="panel" id="estado">
            <div className="panel-head">
              <h2>Estado</h2>
              <span className={`pill ${status.cls}`}>{status.label}</span>
            </div>
            <div className="msg">
              <p className="muted">{status.text}</p>
              <div className="row">
                <a className="btn btn-ghost btn-sm" href={`/admin/b/${id}/experiencia/vista`} target="_blank" rel="noreferrer">Abrir vista previa</a>
                <form action={publishExperienceAction}>
                  <input type="hidden" name="business_id" value={id} />
                  <SubmitButton className="btn btn-dark btn-sm" pending="Publicando…">{x.published ? "Publicar cambios" : "Publicar experiencia"}</SubmitButton>
                </form>
                {x.published && tag && <a className="btn btn-ghost btn-sm" href={`${nfcUrl(tag)}?preview=1`} target="_blank" rel="noreferrer">Ver como cliente</a>}
                {x.published && (
                  <form action={unpublishExperienceAction}>
                    <input type="hidden" name="business_id" value={id} />
                    <SubmitButton className="btn btn-ghost btn-sm" pending="…">Volver a la tarjeta simple</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section className="panel" id="modulos">
            <div className="panel-head"><h2>Módulos</h2><span className="muted">Pro y Enterprise los incluyen</span></div>
            <div className="xp-modules">
              {(Object.keys(MODULES) as ModuleKey[]).map((k) => {
                const on = moduleOn(b, k);
                const src = moduleSource(b, k);
                const soon = k === "reservations";
                return (
                  <div key={k} className="xp-module">
                    <div>
                      <b>{MODULES[k]}</b>
                      <small className="muted">{soon ? "Próximamente (Etapa C)" : `${on ? "Activo" : "Apagado"} · ${src === "plan" ? "según su plan" : "activado a mano"}`}</small>
                      {k === "orders" && on && <small className="muted">Sus clientes piden desde la placa con los productos con precio del catálogo.</small>}
                    </div>
                    {!soon && (
                      <form action={setModuleAdmin} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="business_id" value={id} />
                        <input type="hidden" name="module" value={k} />
                        {src === "manual" && <button className="btn btn-ghost btn-sm" name="value" value="plan">Según plan</button>}
                        <button className={`btn btn-sm ${on ? "btn-ghost" : "btn-dark"}`} name="value" value={on ? "off" : "on"}>{on ? "Apagar" : "Activar"}</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <form action={saveExperienceDraft} className="panel" id="perfil">
            <input type="hidden" name="business_id" value={id} />
            <div className="panel-head"><h2>Presentación</h2><span className="muted">Se guarda como borrador</span></div>
            <div className="form-section">
              <div className="xp-cover">
                {d.cover_url ? <img src={d.cover_url} alt="Portada actual" /> : <div className="xp-cover-empty">Sin portada: se usa el color de la marca</div>}
              </div>
              <div className="grid-2">
                <ImageInput name="cover" label="Portada (foto horizontal)" />
                {d.cover_url && <label className="check" style={{ alignSelf: "center" }}><input type="checkbox" name="remove_cover" value="1" /> <span>Quitar la portada</span></label>}
              </div>
              <label className="field"><span>Frase corta debajo del nombre</span><input className="input" name="tagline" maxLength={120} defaultValue={d.tagline ?? ""} placeholder="Café de especialidad en el Casco Viejo" /></label>
              <label className="field"><span>Sobre el negocio</span><textarea className="textarea" name="about" maxLength={1200} defaultValue={d.about ?? ""} placeholder="Quiénes son, qué los hace especiales." style={{ minHeight: 100 }} /></label>
              <div className="grid-2">
                <label className="field"><span>Nombre del catálogo</span><input className="input" name="catalog_title" maxLength={30} defaultValue={d.catalog_title ?? ""} placeholder="Menú, Servicios, Productos…" /></label>
                <label className="field"><span>Políticas (opcional)</span><input className="input" name="policies" maxLength={800} defaultValue={d.policies ?? ""} placeholder="Se aceptan mascotas. Reservas con 24 h." /></label>
              </div>
            </div>

            <div className="form-section">
              <h3>Horario</h3>
              <label className="check"><input type="checkbox" name="hours_on" value="1" defaultChecked={d.hours.length === 7} /> <span>Mostrar horario y si está abierto ahora</span></label>
              <div className="xp-hours">
                {ORDER.map((n) => {
                  const h = d.hours[n];
                  return (
                    <div key={n} className="xp-hour">
                      <b>{DAYS[n]}</b>
                      <input className="input" type="time" name={`open_${n}`} defaultValue={h?.open ?? "09:00"} aria-label={`${DAYS[n]}: abre`} />
                      <input className="input" type="time" name={`close_${n}`} defaultValue={h?.close ?? "18:00"} aria-label={`${DAYS[n]}: cierra`} />
                      <label className="check"><input type="checkbox" name={`closed_${n}`} value="1" defaultChecked={d.hours.length === 7 && !h} /> <span>Cerrado</span></label>
                    </div>
                  );
                })}
              </div>
              <small className="muted">Si cierra después de medianoche, pon la hora de cierre de la madrugada (ej. 02:00).</small>
            </div>

            <div className="form-section">
              <h3>Contacto y ubicación</h3>
              <div className="grid-2">
                <label className="field"><span>WhatsApp</span><input className="input" name="whatsapp" type="tel" maxLength={30} defaultValue={d.whatsapp ?? ""} placeholder="6000-0000" /></label>
                <label className="field"><span>Teléfono</span><input className="input" name="phone" type="tel" maxLength={30} defaultValue={d.phone ?? ""} placeholder="200-0000" /></label>
                <label className="field"><span>Dirección</span><input className="input" name="address" maxLength={200} defaultValue={d.address ?? ""} placeholder="Calle 50, Edificio X, local 3" /></label>
                <label className="field"><span>Enlace de Google Maps (opcional)</span><input className="input" name="maps_url" maxLength={400} defaultValue={d.maps_url ?? ""} placeholder="https://maps.app.goo.gl/…" /></label>
                <label className="field"><span>Instagram</span><input className="input" name="instagram" maxLength={120} defaultValue={d.instagram ?? ""} placeholder="@negocio" /></label>
                <label className="field"><span>Facebook</span><input className="input" name="facebook" maxLength={160} defaultValue={d.facebook ?? ""} placeholder="negocio o enlace" /></label>
                <label className="field"><span>TikTok</span><input className="input" name="tiktok" maxLength={120} defaultValue={d.tiktok ?? ""} placeholder="@negocio" /></label>
                <label className="field"><span>Sitio web</span><input className="input" name="website" maxLength={400} defaultValue={d.website ?? ""} placeholder="negocio.com" /></label>
              </div>
            </div>

            <div className="form-section">
              <h3>Fotos</h3>
              {d.gallery.length > 0 && (
                <div className="xp-photos">
                  {d.gallery.map((g) => (
                    <label key={g} className="xp-photo">
                      <img src={g} alt="" />
                      <span className="check"><input type="checkbox" name="remove_photo" value={g} /> Quitar</span>
                    </label>
                  ))}
                </div>
              )}
              <ImageInput name="photos" multiple label="Agregar fotos (hasta 12 en total)" />
            </div>

            <div className="form-section">
              <h3>Apartados que se muestran</h3>
              <p className="muted" style={{ fontSize: 14 }}>La tarjeta de reseña siempre está. Un apartado sin contenido no se muestra aunque esté activo.</p>
              <div className="xp-toggles">
                {SECTIONS.map(([k, label]) => (
                  <label key={k} className="xp-toggle"><input type="checkbox" name={`sec_${k}`} value="1" defaultChecked={d.sections[k]} /> <span>{label}</span></label>
                ))}
              </div>
              <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar borrador</SubmitButton>
            </div>
          </form>

          <section className="panel" id="promos">
            <div className="panel-head"><h2>Promociones</h2><span className="muted">Se ven al instante si están activas y en fecha</span></div>
            <PromoManager promos={x.promos} hidden={hidden} today={today} actions={{ save: savePromoAdmin, remove: deletePromoAdmin, toggle: togglePromoAdmin }} />
          </section>

          <section className="panel" id="catalogo">
            <div className="panel-head"><h2>{d.catalog_title || "Productos y servicios"}</h2><span className="muted">Se ven al instante si están visibles</span></div>
            <CatalogManager items={x.items} hidden={hidden} actions={{ save: saveItemAdmin, remove: deleteItemAdmin, toggle: toggleItemAdmin }} />
          </section>
        </div>

        <aside className="xp-preview" aria-label="Vista previa">
          <div className="xp-phone">
            <iframe src={`/admin/b/${id}/experiencia/vista?marco=1`} title="Vista previa de la experiencia" loading="lazy" />
          </div>
          <p className="muted">Vista previa del borrador. Se actualiza al guardar.</p>
        </aside>
      </div>
    </main>
  );
}
