import { type Plan, planOf } from "@/lib/plans";
import type { Business } from "@/lib/types";
import { VERTICALS } from "@/lib/verticals";

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
        <input className="input" name="review" required defaultValue={b?.google_review_url} placeholder="https://g.page/r/…/review  o  Place ID" />
        <small>
          Tiene que abrir la ventana de reseña, no el mapa. Lo mejor: en Google Business, <b>Pedir reseñas</b> → copiar enlace (g.page/r/…/review). O el Place ID (empieza con ChIJ) desde{" "}
          <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            Place ID Finder
          </a>.
        </small>
      </label>
      <div className="field">
        <span>4. Quién recibe las quejas privadas (dueño, gerente o supervisor)</span>
        <div className="grid-2">
          <input className="input" name="manager_name" defaultValue={v?.manager_name ?? ""} placeholder="Nombre" autoComplete="off" aria-label="Nombre del gerente" />
          <input className="input" type="tel" inputMode="tel" name="manager_phone" defaultValue={v?.manager_phone ?? ""} placeholder="WhatsApp: 6000-0000" autoComplete="off" aria-label="WhatsApp del gerente" />
        </div>
        <input className="input" type="email" name="manager_email" defaultValue={b?.manager_email ?? ""} placeholder="Correo: gerente@negocio.com" autoComplete="off" aria-label="Email del gerente" />
        <small>Al correo le llega cada queja al instante. Con su WhatsApp, desde tu panel se la reenvías con un toque.</small>
      </div>
      <div className="field">
        <span>5. Quién paga FiveTap (normalmente el dueño)</span>
        <div className="grid-2">
          <input className="input" name="billing_name" defaultValue={v?.billing_name ?? ""} placeholder="Nombre" autoComplete="off" aria-label="Nombre de quien paga" />
          <input className="input" type="tel" inputMode="tel" name="billing_phone" defaultValue={v?.billing_phone ?? ""} placeholder="WhatsApp: 6000-0000" autoComplete="off" aria-label="WhatsApp de quien paga" />
        </div>
        <input className="input" type="email" name="billing_email" defaultValue={b?.billing_email ?? ""} placeholder="Correo para sus comprobantes de pago" autoComplete="off" aria-label="Correo de quien paga" />
        <small>A este número van los recordatorios de pago y el saludo de los lunes, y a este correo sus comprobantes. Si es la misma persona de las quejas, déjalo vacío.</small>
      </div>
    </div>
  );
}

/** Defaults that rarely change: type, color, plan. */
export function OptionFields({ b, plans, planKey }: { b?: Business; plans: Plan[]; planKey?: string }) {
  const current = b ? (b.status === "trial" && Number(b.monthly_fee) <= 0 ? (b.mode === "google" ? "test-google" : "test") : planOf(b, plans)?.key ?? "") : planKey ?? "start";
  return (
    <div className="form-section">
      <div className="grid-2">
        <label className="field">
          <span>Plan</span>
          <select className="select" name="plan_key" defaultValue={current}>
            {plans.filter((p) => p.active || p.key === current).map((p) => (
              <option key={p.key} value={p.key}>{p.name} · ${p.monthly}/mes · {p.plaques} placas + {p.cards} tarjetas</option>
            ))}
            <option value="test">FiveTap Test con FiveTap Business · 30 días, se cierra solo el día 29</option>
            <option value="test-google">FiveTap Test sin FiveTap Business (directo a Google) · 30 días</option>
            <option value="">Personalizado (sin plan)</option>
          </select>
        </label>
        <label className="field">
          <span>Mensualidad (USD)</span>
          <input className="input" type="number" min={0} step="0.01" name="monthly_fee" defaultValue={b ? b.monthly_fee : undefined} placeholder="La del plan" />
          <small>{b ? "Su precio queda congelado aunque cambies el plan en Planes." : "Vacío: el precio del plan. Pon 0 para un negocio de prueba (no cobra ni se pausa)."}</small>
        </label>
        <label className="field">
          <span>Tipo de negocio</span>
          <select className="select" name="kind" defaultValue={b?.kind ?? "restaurant"}>
            {VERTICALS.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Color del botón principal</span>
          <input className="input" type="color" name="brand_color" defaultValue={b?.brand_color ?? "#0a0a0a"} />
        </label>
      </div>
      {/* One-time pieces are no longer sold; kept only for venues that already had them. */}
      <input type="hidden" name="mode" value={b?.mode === "google" ? "google" : "full"} />
      <input type="hidden" name="setup_fee" value={b?.setup_fee ?? 0} />
    </div>
  );
}
