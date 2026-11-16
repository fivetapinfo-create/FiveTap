import { featureByKey, type FeatureKey } from "@/lib/features";
import { requestUpgrade } from "@/app/mi/[token]/actions";
import { SubmitButton } from "./SubmitButton";

/**
 * What a business sees instead of a tool it has not contracted: what the tool does and a way
 * to ask for it. Never an error and never a broken screen.
 */
export function Upsell({ feature, token, compact }: { feature: FeatureKey; token: string; compact?: boolean }) {
  const f = featureByKey(feature);
  if (!f) return null;
  return (
    <section className={`panel upsell${compact ? " upsell-compact" : ""}`} aria-label={f.name}>
      <span className="upsell-badge">Funcionalidad avanzada</span>
      <h2>{f.name}</h2>
      <p className="muted">{f.what}</p>
      <p>Esta herramienta forma parte de las funcionalidades avanzadas de FiveTap. Solicita una ampliación de tu servicio para habilitarla.</p>
      <form action={requestUpgrade}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="feature" value={feature} />
        <SubmitButton className="btn btn-dark btn-sm" pending="Enviando…">Solicitar cotización</SubmitButton>
      </form>
    </section>
  );
}
