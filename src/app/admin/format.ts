import type { BusinessStatus } from "@/lib/types";

export const STATUS_LABEL: Record<BusinessStatus, string> = {
  trial: "Prueba",
  active: "Activo",
  paused: "Pausado",
  canceled: "Cancelado",
};

export const usd = (n: number | string) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const pct = (part?: number | null, whole?: number | null) =>
  // Capped: one guest can tap "Dejar reseña" more than once per visit.
  whole ? `${Math.min(100, Math.round((Number(part ?? 0) / Number(whole)) * 100))}%` : "—";

export function ago(iso?: string | null): string {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PA", { timeZone: "America/Panama", dateStyle: "medium", timeStyle: "short" });
