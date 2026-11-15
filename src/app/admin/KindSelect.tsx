"use client";

import { useState } from "react";
import { presetFor } from "@/lib/presets";
import type { Vertical } from "@/lib/verticals";

/** Type of business, with what FiveTap will set up for it (all editable afterwards). */
export function KindSelect({ kinds, defaultKind, label }: { kinds: Pick<Vertical, "key" | "label">[]; defaultKind?: string; label: string }) {
  const [kind, setKind] = useState(defaultKind ?? "restaurant");
  const p = presetFor(kind);
  const on = [p.modules.orders && "Pedidos", p.modules.reservations && "Reservas"].filter(Boolean).join(" y ");
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        {kinds.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
      </select>
      <small className="plan-pick-info">
        <b>Se configura solo:</b> {p.summary}. Catálogo: “{p.catalog_title}”. {on ? `${on} quedan activados.` : "Sin pedidos ni reservas."} Sugerencia: {p.offer}. Todo se puede cambiar después.
      </small>
    </label>
  );
}
