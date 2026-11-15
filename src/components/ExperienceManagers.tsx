import type { CatalogItem, Promotion } from "@/lib/experience-shape";
import { promoLive } from "@/lib/experience-shape";
import { ImageInput } from "./ImageInput";
import { SubmitButton } from "./SubmitButton";

type Actions = {
  save: (f: FormData) => Promise<void>;
  remove: (f: FormData) => Promise<void>;
  toggle: (f: FormData) => Promise<void>;
};
type Common = { hidden: Record<string, string>; today: string };

const Hidden = ({ h }: { h: Record<string, string> }) => <>{Object.entries(h).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}</>;
const shortDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12)).toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "UTC" });
};
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function PromoFields({ p }: { p?: Promotion }) {
  return (
    <>
      <div className="grid-2">
        <label className="field"><span>Título</span><input className="input" name="title" required minLength={2} maxLength={80} defaultValue={p?.title} placeholder="2x1 en cafés los martes" /></label>
        <ImageInput name="image" label="Imagen (opcional)" />
        <label className="field"><span>Desde (opcional)</span><input className="input" type="date" name="starts_on" defaultValue={p?.starts_on ?? ""} /></label>
        <label className="field"><span>Hasta (opcional)</span><input className="input" type="date" name="ends_on" defaultValue={p?.ends_on ?? ""} /></label>
      </div>
      <label className="field"><span>Descripción (opcional)</span><textarea className="textarea" name="body" maxLength={400} defaultValue={p?.body ?? ""} placeholder="Válido en el local. No acumulable." style={{ minHeight: 80 }} /></label>
      {p?.image_url && <label className="check"><input type="checkbox" name="remove_image" value="1" /> <span>Quitar la imagen actual</span></label>}
    </>
  );
}

/** Promotions of one business: what is live now, scheduled or paused, and a form to add more. */
export function PromoManager({ promos, actions, hidden, today }: { promos: Promotion[]; actions: Actions } & Common) {
  return (
    <div className="xm">
      {promos.length === 0 ? (
        <div className="empty xm-empty"><p>Aún no hay promociones. La primera que agregues aparece en la página de la placa.</p></div>
      ) : (
        <ul className="xm-list">
          {promos.map((p) => {
            const live = promoLive(p, today);
            const state = !p.active ? "Pausada" : live ? "Visible ahora" : p.starts_on && p.starts_on > today ? `Empieza el ${shortDay(p.starts_on)}` : "Terminó";
            return (
              <li key={p.id} className="xm-row">
                {p.image_url ? <img src={p.image_url} alt="" className="xm-thumb" /> : <span className="xm-thumb xm-thumb-empty" aria-hidden="true" />}
                <div className="xm-main">
                  <b>{p.title}</b>
                  <small className="muted">{[p.ends_on ? `Hasta el ${shortDay(p.ends_on)}` : null, p.body].filter(Boolean).join(" · ") || "Sin fecha de fin"}</small>
                </div>
                <span className={`pill ${live ? "active" : "paused"}`}>{state}</span>
                <div className="xm-actions">
                  <form action={actions.toggle}>
                    <Hidden h={hidden} /><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={p.active ? "0" : "1"} />
                    <SubmitButton className="btn btn-ghost btn-sm" pending="…">{p.active ? "Pausar" : "Activar"}</SubmitButton>
                  </form>
                  <details className="xm-edit">
                    <summary className="btn btn-ghost btn-sm">Editar</summary>
                    <form action={actions.save} className="xm-form">
                      <Hidden h={hidden} /><input type="hidden" name="promo_id" value={p.id} /><input type="hidden" name="active" value={p.active ? "1" : "0"} />
                      <PromoFields p={p} />
                      <div className="row">
                        <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">Guardar</SubmitButton>
                      </div>
                    </form>
                    <form action={actions.remove} className="xm-delete">
                      <Hidden h={hidden} /><input type="hidden" name="id" value={p.id} />
                      <label className="check"><input type="checkbox" name="confirm" value="1" required /> <span>Eliminar esta promoción</span></label>
                      <SubmitButton className="btn btn-danger btn-sm" pending="…">Eliminar</SubmitButton>
                    </form>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <details className="more xm-add">
        <summary>+ Nueva promoción</summary>
        <form action={actions.save} className="xm-form">
          <Hidden h={hidden} />
          <PromoFields />
          <SubmitButton className="btn btn-dark" pending="Guardando…">Agregar promoción</SubmitButton>
        </form>
      </details>
    </div>
  );
}

function ItemFields({ x, categories }: { x?: CatalogItem; categories: string[] }) {
  const listId = `cats-${x?.id ?? "new"}`;
  return (
    <>
      <div className="grid-2">
        <label className="field"><span>Nombre</span><input className="input" name="name" required minLength={2} maxLength={80} defaultValue={x?.name} placeholder="Cappuccino" /></label>
        <label className="field"><span>Precio (opcional)</span><input className="input" name="price" inputMode="decimal" defaultValue={x?.price ?? ""} placeholder="3.50" /></label>
        <label className="field">
          <span>Categoría (opcional)</span>
          <input className="input" name="category" maxLength={40} defaultValue={x?.category ?? ""} list={listId} placeholder="Bebidas" />
          <datalist id={listId}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <ImageInput name="image" label="Foto (opcional)" />
      </div>
      <label className="field"><span>Descripción (opcional)</span><textarea className="textarea" name="description" maxLength={300} defaultValue={x?.description ?? ""} style={{ minHeight: 70 }} /></label>
      {x?.image_url && <label className="check"><input type="checkbox" name="remove_image" value="1" /> <span>Quitar la foto actual</span></label>}
    </>
  );
}

/** Products or services of one business, grouped by category, with a form to add more. */
export function CatalogManager({ items, actions, hidden }: { items: CatalogItem[]; actions: Actions } & Omit<Common, "today">) {
  const categories = [...new Set(items.map((x) => x.category).filter((c): c is string => Boolean(c)))];
  const groups = [...new Set(items.map((x) => x.category || ""))];
  return (
    <div className="xm">
      {items.length === 0 ? (
        <div className="empty xm-empty"><p>Aún no hay productos ni servicios. Agrega el primero y aparecerá en la página de la placa.</p></div>
      ) : (
        groups.map((g) => (
          <div key={g || "none"} className="xm-group">
            <h4 className="xm-group-name">{g || "Sin categoría"} <span className="muted">· {items.filter((x) => (x.category || "") === g).length}</span></h4>
            <ul className="xm-list">
              {items.filter((x) => (x.category || "") === g).map((x) => (
                <li key={x.id} className="xm-row">
                  {x.image_url ? <img src={x.image_url} alt="" className="xm-thumb" /> : <span className="xm-thumb xm-thumb-empty" aria-hidden="true" />}
                  <div className="xm-main">
                    <b>{x.name}</b>
                    <small className="muted">{[x.price != null ? usd(x.price) : null, x.description].filter(Boolean).join(" · ") || "Sin precio"}</small>
                  </div>
                  <span className={`pill ${x.active ? "active" : "paused"}`}>{x.active ? "Visible" : "Oculto"}</span>
                  <div className="xm-actions">
                    <form action={actions.toggle}>
                      <Hidden h={hidden} /><input type="hidden" name="id" value={x.id} /><input type="hidden" name="active" value={x.active ? "0" : "1"} />
                      <SubmitButton className="btn btn-ghost btn-sm" pending="…">{x.active ? "Ocultar" : "Mostrar"}</SubmitButton>
                    </form>
                    <details className="xm-edit">
                      <summary className="btn btn-ghost btn-sm">Editar</summary>
                      <form action={actions.save} className="xm-form">
                        <Hidden h={hidden} /><input type="hidden" name="item_id" value={x.id} /><input type="hidden" name="active" value={x.active ? "1" : "0"} />
                        <ItemFields x={x} categories={categories} />
                        <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">Guardar</SubmitButton>
                      </form>
                      <form action={actions.remove} className="xm-delete">
                        <Hidden h={hidden} /><input type="hidden" name="id" value={x.id} />
                        <label className="check"><input type="checkbox" name="confirm" value="1" required /> <span>Eliminar este producto</span></label>
                        <SubmitButton className="btn btn-danger btn-sm" pending="…">Eliminar</SubmitButton>
                      </form>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <details className="more xm-add">
        <summary>+ Nuevo producto o servicio</summary>
        <form action={actions.save} className="xm-form">
          <Hidden h={hidden} />
          <ItemFields categories={categories} />
          <SubmitButton className="btn btn-dark" pending="Guardando…">Agregar</SubmitButton>
        </form>
      </details>
    </div>
  );
}
