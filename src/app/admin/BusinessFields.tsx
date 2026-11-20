import { type Plan, planOf } from "@/lib/plans";
import { PlanPicker, type PickPlan } from "./PlanPicker";
import { KindSelect } from "./KindSelect";
import { BrandColors } from "./BrandColors";
import { TIERS } from "@/lib/features";

// Reference plans are no longer sold: only a venue already on one still sees it.
const pick = (plans: Plan[], keep?: string): PickPlan[] =>
  plans.filter((p) => p.key === keep).map((p) => ({ key: p.key, name: p.name, monthly: p.monthly, plaques: p.plaques, cards: p.cards, lanyards: p.lanyards, flex_pieces: p.flex_pieces, line: p.line }));
import type { Business } from "@/lib/types";
import { PANEL_KINDS } from "@/lib/verticals";

/** The essentials of a business. Everything else has a sensible default. */
export function EssentialFields({ b, prefill }: { b?: Business; prefill?: Partial<Business> }) {
  const v = b ?? prefill;
  return (
    <div className="form-section">
      <label className="field">
        <span>1. Nombre del negocio</span>
        <input className="input" name="name" required maxLength={80} defaultValue={v?.name} placeholder="La Terraza Casco Viejo" autoFocus={!b} />
      </label>
      <label className="field">
        <span>2. Logo {b ? "(subir para reemplazar)" : "(opcional)"}</span>
        <input className="input" type="file" name="logo" accept="image/png,image/jpeg,image/webp" />
        <small>PNG, JPG o WEBP. Sin logo usamos sus iniciales.</small>
      </label>
      <label className="field">
        <span>3. Enlace de reseñas de Google</span>
        <input className="input" name="review" required defaultValue={v?.google_review_url} placeholder="https://g.page/r/…/review  o  Place ID" />
        <small>
          Tiene que abrir la ventana de reseña, no el mapa. Lo mejor: en Google Business, <b>Pedir reseñas</b> → copiar enlace (g.page/r/…/review). O el Place ID (empieza con ChIJ) desde{" "}
          <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            Place ID Finder
          </a>.
        </small>
      </label>
      <label className="field">
        <span>Place ID del local (para medir sus reseñas)</span>
        <input className="input" name="place_id" defaultValue={v?.google_place_id ?? ""} placeholder="ChIJ… (opcional si ya lo pegaste arriba)" autoComplete="off" />
        <small>Con el Place ID, FiveTap lee cada semana de Google cuántas reseñas y estrellas tiene el local y se lo muestra al dueño.</small>
      </label>
      <div className="field">
        <span>4. Quién recibe las quejas privadas (dueño, gerente o supervisor)</span>
        <div className="grid-2">
          <input className="input" name="manager_name" defaultValue={v?.manager_name ?? ""} placeholder="Nombre" autoComplete="off" aria-label="Nombre del gerente" />
          <input className="input" type="tel" inputMode="tel" name="manager_phone" defaultValue={v?.manager_phone ?? ""} placeholder="WhatsApp: 6000-0000" autoComplete="off" aria-label="WhatsApp del gerente" />
        </div>
        <input className="input" type="email" name="manager_email" defaultValue={v?.manager_email ?? ""} placeholder="Correo: gerente@negocio.com" autoComplete="off" aria-label="Email del gerente" />
        <small>Al correo le llega cada queja al instante. Con su WhatsApp, desde tu panel se la reenvías con un toque.</small>
      </div>
      <div className="field">
        <span>5. Quién paga FiveTap (normalmente el dueño)</span>
        <div className="grid-2">
          <input className="input" name="billing_name" defaultValue={v?.billing_name ?? ""} placeholder="Nombre" autoComplete="off" aria-label="Nombre de quien paga" />
          <input className="input" type="tel" inputMode="tel" name="billing_phone" defaultValue={v?.billing_phone ?? ""} placeholder="WhatsApp: 6000-0000" autoComplete="off" aria-label="WhatsApp de quien paga" />
        </div>
        <input className="input" type="email" name="billing_email" defaultValue={v?.billing_email ?? ""} placeholder="Correo para sus comprobantes de pago" autoComplete="off" aria-label="Correo de quien paga" />
        <small>A este número van los recordatorios de pago y el saludo de los lunes, y a este correo sus comprobantes. Si es la misma persona de las quejas, déjalo vacío.</small>
      </div>
    </div>
  );
}

/** Defaults that rarely change: type, color, plan. */
export function OptionFields({ b, plans, planKey, compact }: { b?: Business; plans: Plan[]; planKey?: string; compact?: boolean }) {
  const current = b
    ? b.status === "trial" && Number(b.monthly_fee) <= 0 ? (b.mode === "google" ? "test-google" : "test")
      : b.mode === "google" && Number(b.monthly_fee) <= 0 && !b.plan_key ? "once"
      : planOf(b, plans)?.key ?? "custom"
    : planKey ?? "custom";
  return (
    <div className="form-section">
      <div className="grid-2">
        {!compact && (<>
        <PlanPicker plans={pick(plans, current)} defaultKey={current} label="Plan" />
        <label className="field">
          <span>Mensualidad (USD)</span>
          <input className="input" type="number" min={0} step="0.01" name="monthly_fee" defaultValue={b ? b.monthly_fee : undefined} placeholder="Ej. 300" />
          <small>La mensualidad cotizada para este local. Pon 0 para un negocio de prueba (no cobra ni se pausa).</small>
        </label>
        <label className="field">
          <span>Tipo de negocio</span>
          <select className="select" name="kind" defaultValue={b?.kind ?? "restaurant"}>
            {PANEL_KINDS.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
        </>)}
        <BrandColors primary={b?.brand_color} accent={b?.brand_accent} logoUrl={b?.logo_url} />
      </div>
      {/* One-time pieces are no longer sold; kept only for venues that already had them. */}
      <input type="hidden" name="mode" value={b?.mode === "google" ? "google" : "full"} />
      <input type="hidden" name="setup_fee" value={b?.setup_fee ?? 0} />
    </div>
  );
}

/** The "before": reviews and stars in Google the day FiveTap is installed. Only when creating. */
export function BaselineFields({ auto }: { auto: boolean }) {
  return (
    <div className="form-section">
      <div className="field">
        <span>8. Reseñas en Google hoy (el “antes”)</span>
        <div className="grid-2">
          <input className="input" name="reviews_start" inputMode="numeric" pattern="[0-9]*" required={!auto} placeholder="Reseñas: 84" aria-label="Reseñas en Google hoy" />
          <input className="input" name="rating_start" inputMode="decimal" placeholder="Estrellas: 4.3" aria-label="Estrellas en Google hoy" />
        </div>
        <small>
          {auto
            ? "Con el Place ID lo leemos solo de Google; escríbelo solo si quieres anotarlo tú."
            : "Míralo en Google Maps: el número entre paréntesis junto a las estrellas. Es lo que le mostrarás al dueño a los 3 meses."}
        </small>
      </div>
    </div>
  );
}

/**
 * What the venue bought, always visible when creating: plan (no default, so a FiveTap Test
 * is never saved as a monthly plan by mistake), type of business and how many pieces.
 */
export function PlanFields({ plans, planKey, kind }: { plans: Plan[]; planKey?: string; kind?: string }) {
  return (
    <div className="form-section">
      <div className="grid-2">
        <KindSelect kinds={PANEL_KINDS.map((v) => ({ key: v.key, label: v.label }))} defaultKind={kind} label="6. Tipo de negocio" />
        <PlanPicker plans={pick(plans)} defaultKey={planKey} pieces label="7. ¿Qué contrató?" />
        <label className="field">
          <span>8. Nivel de funciones</span>
          <select className="select" name="tier" defaultValue="">
            <option value="">Automático según lo contratado</option>
            {TIERS.map((t) => <option key={t.key} value={t.key}>{t.name} — {t.hint}</option>)}
          </select>
          <small>Define qué herramientas recibe. Luego lo ajustas por función en su ficha (Contratación y permisos).</small>
        </label>
      </div>
      <small className="muted">Plan personalizado: escribe la mensualidad y las piezas que cotizaste. Pago único: de 1 a 4 piezas directas a Google, sin mensualidad.</small>
    </div>
  );
}
