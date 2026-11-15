"use client";

import { useState } from "react";
import { planPieces, planShort } from "@/lib/plan-text";

export type PickPlan = { key: string; name: string; monthly: number; plaques: number; cards: number; lanyards: number; flex_pieces: boolean; line: "main" | "compact" };

const ONCE = "Pago único · de 1 a 4 piezas, directas a Google (sin sistema)";
const CUSTOM = "Plan a la medida · cotizado con el cliente (mensualidad y piezas a mano)";

/**
 * What the client bought: plans grouped the way they are sold (test, small businesses,
 * main plans), with what the chosen one includes. When creating, it also asks how many
 * plaques and team cards to make; in the small plans the client picks the mix.
 */
export function PlanPicker({ plans, defaultKey, pieces, label = "¿Qué contrató?" }: { plans: PickPlan[]; defaultKey?: string; pieces?: boolean; label?: string }) {
  const [key, setKey] = useState(defaultKey ?? "");
  const plan = plans.find((p) => p.key === key);
  const small = plans.filter((p) => p.line === "compact");
  const main = plans.filter((p) => p.line !== "compact");
  const opt = (p: PickPlan) => <option key={p.key} value={p.key}>{p.name} · ${p.monthly}/mes · {planShort(p)}</option>;

  return (
    <>
      <label className="field">
        <span>{label}</span>
        <select className="select" name="plan_key" value={key} onChange={(e) => setKey(e.target.value)} required>
          <option value="" disabled>Elige…</option>
          <optgroup label="Pago único (1 a 4 piezas)">
            <option value="once">{ONCE}</option>
          </optgroup>
          <optgroup label="Plan mensual · con FiveTap Business">
            <option value="custom">{CUSTOM}</option>
            {[...main, ...small].map(opt)}
          </optgroup>
        </select>
        {plan ? (
          <small className="plan-pick-info">
            Plan de referencia: <b>${plan.monthly}/mes</b> · {planPieces(plan).join(" · ")} · FiveTap Business. Si cotizaste otra mensualidad o piezas, escríbelas abajo
            {plan.flex_pieces ? ". Reparte las piezas abajo entre placas y tarjetas." : ""}
          </small>
        ) : key === "once" ? (
          <small className="plan-pick-info">Placa $40 · tarjeta $35 · Pack Dúo 2 por $60 · Pack Local 4 por $110. De 1 a 4 piezas; desde 5 va un plan mensual. Abren directo Google, sin app ni mensualidad; nunca se pausan. Registra la venta en Contratos → Plan Test.</small>
        ) : key === "custom" ? (
          <small className="plan-pick-info">La mensualidad y las piezas que acordaste con el cliente, según lo que le sale beneficioso. Normalmente desde 5 piezas; también sirve para una sola placa mensual, por ejemplo el mostrador de un restaurante. Escríbelas abajo.</small>
        ) : null}
      </label>
      {pieces && (
        <>
          <label className="field">
            <span>Placas</span>
            <input className="input" type="number" name="spots" min={0} max={80} key={`s-${key}`} placeholder={key === "once" ? "Ej. 1" : plan ? String(plan.plaques) + (plan.flex_pieces ? " (si no hay tarjetas)" : "") : "Las del plan"} />
          </label>
          <label className="field">
            <span>Tarjetas de equipo</span>
            <input className="input" type="number" name="cards" min={0} max={40} key={`c-${key}`} placeholder={key === "once" ? "Ej. 0" : plan ? String(plan.flex_pieces ? 0 : plan.cards) : "Las del plan"} />
          </label>
        </>
      )}
    </>
  );
}
