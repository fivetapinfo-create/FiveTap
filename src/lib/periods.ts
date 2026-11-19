// Date filters for the owner's dashboards: quick ranges or a custom one (Panamá time).

export type Range = { key: string; from: string; to?: string; label: string; days: number };
const DAY = 86_400_000;
export const QUICK = [{ key: "7", label: "7 días" }, { key: "30", label: "30 días" }, { key: "90", label: "90 días" }] as const;
const okDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function rangeFrom(sp: { periodo?: string; desde?: string; hasta?: string }): Range {
  const d = okDate(sp.desde), h = okDate(sp.hasta);
  if (d) {
    const from = `${d}T05:00:00Z`;
    const to = h ? new Date(Date.parse(`${h}T05:00:00Z`) + DAY).toISOString() : undefined;
    const days = Math.max(1, Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / DAY));
    return { key: "custom", from, to, days, label: h ? `${d} a ${h}` : `Desde ${d}` };
  }
  const q = QUICK.find((x) => x.key === sp.periodo) ?? QUICK[1];
  return { key: q.key, from: new Date(Date.now() - Number(q.key) * DAY).toISOString(), days: Number(q.key), label: q.label };
}
