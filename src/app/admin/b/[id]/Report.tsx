"use client";

import { useState } from "react";
import type { ReportPeriod, ReviewSnapshot } from "@/lib/data";

/** Builds the monthly WhatsApp report for the owner, ready to copy and paste. */
export function Report({ business, periods, snapshots = [] }: { business: string; periods: ReportPeriod[]; snapshots?: ReviewSnapshot[] }) {
  const [key, setKey] = useState<ReportPeriod["key"]>("prev");
  // Starts from the latest count taken in "Reseñas en Google" (if any after the "before" one).
  const latest = snapshots.length > 1 ? snapshots.at(-1) : undefined;
  const [stars, setStars] = useState(latest?.rating ? latest.rating.toFixed(1) : "");
  const [count, setCount] = useState(latest ? String(latest.reviews) : "");
  const [done, setDone] = useState(false);
  const p = periods.find((x) => x.key === key)!;
  const text = reportText(business, p, stars.trim(), count.trim(), snapshots[0]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Reporte mensual</h2>
        <div className="seg" role="tablist">
          {periods.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={x.key === key} onClick={() => setKey(x.key)}>
              {x.key === "prev" ? "Mes pasado" : "Este mes"}
            </button>
          ))}
        </div>
      </div>
      <div className="report">
        <div className="report-fields">
          <label className="field">
            <span>Estrellas en Google hoy</span>
            <input className="input" inputMode="decimal" placeholder="4.7" value={stars} onChange={(e) => setStars(e.target.value)} />
          </label>
          <label className="field">
            <span>Reseñas en Google hoy</span>
            <input className="input" inputMode="numeric" placeholder="312" value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
          <small className="muted">Opcional: míralo en Google Maps. Si lo dejas vacío, no sale en el mensaje.</small>
        </div>
        <pre className="report-text">{text}</pre>
        <button
          type="button"
          className="btn btn-dark btn-sm"
          style={{ width: "fit-content" }}
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
        >
          {done ? "Copiado ✓" : "Copiar reporte"}
        </button>
      </div>
    </section>
  );
}

function reportText(business: string, p: ReportPeriod, stars: string, count: string, before?: ReviewSnapshot) {
  const rate = p.scans ? Math.min(100, Math.round((p.reviews / p.scans) * 100)) : 0;
  const lines = [
    `Hola 👋 Este es el reporte de FiveTap de *${business}* — ${p.label}.`,
    "",
    `📲 *${p.scans}* ${p.scans === 1 ? "cliente tocó o escaneó" : "clientes tocaron o escanearon"} la placa (${p.nfc} con NFC, ${p.qr} con QR).`,
    `⭐ *${p.reviews}* ${p.reviews === 1 ? "fue" : "fueron"} a dejar su reseña en Google${p.scans ? ` (${rate}% de los que la tocaron)` : ""}.`,
    `💬 *${p.feedback}* ${p.feedback === 1 ? "mensaje privado llegó" : "mensajes privados llegaron"} directo a ti, sin pasar por Google.`,
  ];
  if (p.club > 0) lines.push(`🎁 *${p.club}* ${p.club === 1 ? "cliente nuevo se unió" : "clientes nuevos se unieron"} a tu club de WhatsApp.`);
  if (p.top && p.top.scans > 0) lines.push(`🏆 Con más actividad: ${p.top.label} (${p.top.scans}).`);
  if (stars || count) {
    const parts = [stars && `${stars} estrellas`, count && `${count} reseñas`].filter(Boolean).join(" · ");
    lines.push(`📍 Tu perfil de Google hoy: ${parts}.`);
  }
  const now = Number(count);
  if (before && count && Number.isFinite(now) && now > before.reviews) {
    lines.push(`📈 Antes de FiveTap tenías *${before.reviews}* reseñas. Hoy tienes *${now}*: *+${now - before.reviews}* gracias a tus clientes felices.`);
  }
  lines.push("", "Cualquier cosa me escribes. — FiveTap");
  return lines.join("\n");
}
