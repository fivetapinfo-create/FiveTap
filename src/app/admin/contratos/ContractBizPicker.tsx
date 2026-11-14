"use client";

import { useState } from "react";

export type ContractBiz = { id: string; name: string; plan: string; fee: number; plaques: number; cards: number; test: boolean };

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Business picker of the contract form, with what the contract will say before creating it. */
export function ContractBizPicker({ businesses, defaultId }: { businesses: ContractBiz[]; defaultId?: string }) {
  const [id, setId] = useState(defaultId ?? "");
  const b = businesses.find((x) => x.id === id);
  return (
    <>
      <label className="field">
        <span>Negocio</span>
        <select className="select" name="business_id" value={id} onChange={(e) => setId(e.target.value)} required>
          <option value="" disabled>Elige el negocio</option>
          {businesses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      {b && (
        <div className={`contract-preview${b.test || b.fee <= 0 ? " warn" : ""}`}>
          <span className="muted">El contrato dirá</span>
          <b>{b.plan} · {usd(b.fee)} al mes</b>
          <span>
            {[b.plaques ? `${b.plaques} ${b.plaques === 1 ? "placa" : "placas"}` : null, b.cards ? `${b.cards} ${b.cards === 1 ? "tarjeta de equipo" : "tarjetas de equipo"} con cordón` : null].filter(Boolean).join(" · ") || "Sin piezas activas todavía"} · FiveTap Business
          </span>
          {(b.test || b.fee <= 0) && (
            <small>Este negocio está en FiveTap Test o sin mensualidad. Antes de crear el contrato, cámbialo a su plan en su ficha → Editar datos → Plan.</small>
          )}
          <a href={`/admin/b/${b.id}#datos`} className="muted">Cambiar plan o piezas en la ficha del negocio →</a>
        </div>
      )}
    </>
  );
}
