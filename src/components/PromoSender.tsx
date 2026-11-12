"use client";

import { useState } from "react";
import { Megaphone } from "./Icons";

type Person = { id: string; name: string; phone: string; birthday?: boolean };

/**
 * Sends a promotion to the club one WhatsApp at a time, from the owner's own phone:
 * write it once, then tap each name. Free, no WhatsApp API. "{nombre}" becomes each name.
 */
export function PromoSender({ business, people }: { business: string; people: Person[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(`Hola {nombre} 👋 Te escribe ${business}. Esta semana tenemos una promoción para los miembros de nuestro club: `);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [onlyBirthdays, setOnlyBirthdays] = useState(false);
  const list = onlyBirthdays ? people.filter((p) => p.birthday) : people;
  const first = (n: string) => n.trim().split(/\s+/)[0] ?? "";
  const href = (p: Person) => `https://wa.me/${p.phone}?text=${encodeURIComponent(text.replaceAll("{nombre}", first(p.name)))}`;

  if (!open) {
    return (
      <div className="promo-start">
        <button className="btn btn-dark btn-sm btn-icon" type="button" onClick={() => setOpen(true)}><Megaphone />Enviar una promoción</button>
        <small className="muted">Escríbela una vez y envíala por WhatsApp a cada cliente con un toque.</small>
      </div>
    );
  }
  return (
    <div className="promo">
      <label className="field">
        <span>Tu mensaje</span>
        <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={700} />
        <small>{"{nombre}"} se cambia por el nombre de cada cliente. Envía solo promociones: tus clientes dieron su permiso para eso.</small>
      </label>
      <div className="row">
        {people.some((p) => p.birthday) && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOnlyBirthdays((v) => !v)} aria-pressed={onlyBirthdays}>
            {onlyBirthdays ? "Ver todos" : "Solo cumpleaños del mes"}
          </button>
        )}
        <span className="muted">{sent.size} de {list.length} enviados</span>
      </div>
      <ul className="promo-list">
        {list.map((p) => (
          <li key={p.id}>
            <span>{p.name}</span>
            <a
              className={`btn btn-sm ${sent.has(p.id) ? "btn-ghost" : "btn-dark"}`}
              href={href(p)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSent((s) => new Set(s).add(p.id))}
            >
              {sent.has(p.id) ? "Enviado ✓" : "Enviar"}
            </a>
          </li>
        ))}
      </ul>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)}>Cerrar</button>
    </div>
  );
}
