import type { ReportPeriod } from "./data";

/** A short, honest success line for the month, based on what really happened. */
export function successLine(p: ReportPeriod, venue: string) {
  if (p.reviews >= 20) return `¡Mes extraordinario, ${venue}! ${p.reviews} clientes fueron a dejarte su reseña. Tu equipo está haciendo un gran trabajo. 🏆`;
  if (p.reviews >= 5) return `¡Gran mes, ${venue}! ${p.reviews} clientes felices fueron a Google por ti. Sigamos sumando estrellas. ⭐`;
  if (p.reviews > 0) return `¡Buen comienzo, ${venue}! ${p.reviews === 1 ? "Un cliente fue" : `${p.reviews} clientes fueron`} a dejarte su reseña. Invita a tus clientes a tocar la placa al traer la cuenta. 💪`;
  if (p.scans > 0) return `Tus clientes ya tocan las placas, ${venue}. El siguiente paso: que tu equipo los invite a dejar su reseña al traer la cuenta. 🙌`;
  return `Este mes empieza tu historia con FiveTap, ${venue}. Pon las placas a la vista y pide a tu equipo que las mencione. 🚀`;
}
