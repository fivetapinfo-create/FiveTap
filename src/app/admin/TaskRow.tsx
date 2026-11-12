import Link from "next/link";
import type { Task, TaskKind } from "@/lib/agenda";
import { markWebPaymentHandled } from "./actions";

export const ICON: Record<TaskKind, string> = {
  cobro: "💵",
  recordatorio: "⏰",
  prueba: "🧪",
  renovacion: "🔁",
  reporte: "📊",
  contrato: "📝",
  mensajes: "💬",
  instalacion: "🔧",
  animo: "☀️",
  cancelacion: "⚠️",
  registro: "🆕",
  pagoweb: "💳",
};

/** One to-do with its ready-made WhatsApp and the button to open the venue. */
export function TaskRow({ t }: { t: Task }) {
  return (
    <div className="msg agenda-task">
      <div className="agenda-line">
        <span className="agenda-icon" aria-hidden>{ICON[t.kind]}</span>
        <div>
          <b>{t.title}</b>
          <p className="muted">{t.detail}</p>
        </div>
      </div>
      {(t.whatsapp || t.businessId || t.link || t.webPaymentId || t.kind === "mensajes") && (
        <div className="row msg-actions">
          {t.whatsapp && (
            <a className="btn btn-dark btn-sm" href={t.whatsapp} target="_blank" rel="noopener noreferrer">
              Enviar WhatsApp con el mensaje listo
            </a>
          )}
          {t.link && <Link className="btn btn-dark btn-sm" href={t.link.href}>{t.link.label}</Link>}
          {t.webPaymentId && (
            <>
              <Link className="btn btn-ghost btn-sm" href="/admin">Buscar el negocio</Link>
              <form action={markWebPaymentHandled}>
                <input type="hidden" name="id" value={t.webPaymentId} />
                <button className="btn btn-dark btn-sm" type="submit">Ya lo registré</button>
              </form>
            </>
          )}
          {t.kind === "mensajes" && <Link className="btn btn-ghost btn-sm" href="/admin/mensajes">Ver mensajes</Link>}
          {t.businessId && <Link className="btn btn-ghost btn-sm" href={`/admin/b/${t.businessId}`}>Abrir negocio</Link>}
        </div>
      )}
    </div>
  );
}
