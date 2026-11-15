// Reservation rules shared by the guest form (browser) and the server: which days and
// times can be booked, given the business's hours and settings. No server imports.

import type { DayHours } from "./experience-shape";

export type ReservationSettings = {
  /** Largest party a guest can book alone; bigger groups write to the venue. */
  max_party: number;
  /** How many days ahead a guest can book. */
  days_ahead: number;
  /** Minimum hours between now and the reservation. */
  min_notice_hours: number;
  /** Minutes between the times offered. */
  slot_minutes: number;
  /** Last time offered, this many minutes before closing. */
  last_before_close: number;
};

export const DEFAULT_RESERVATION_SETTINGS: ReservationSettings = { max_party: 12, days_ahead: 30, min_notice_hours: 2, slot_minutes: 30, last_before_close: 60 };

export function asSettings(v: unknown): ReservationSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<ReservationSettings>;
  const n = (x: unknown, d: number, min: number, max: number) => (typeof x === "number" && x >= min && x <= max ? Math.round(x) : d);
  const d = DEFAULT_RESERVATION_SETTINGS;
  return {
    max_party: n(o.max_party, d.max_party, 1, 200),
    days_ahead: n(o.days_ahead, d.days_ahead, 1, 365),
    min_notice_hours: n(o.min_notice_hours, d.min_notice_hours, 0, 72),
    slot_minutes: n(o.slot_minutes, d.slot_minutes, 15, 120),
    last_before_close: n(o.last_before_close, d.last_before_close, 0, 240),
  };
}

/** Where guests come from, as they declare it. Panamá first; the rest are the most common visitors. */
export const COUNTRIES = [
  "Panamá", "Colombia", "Venezuela", "Costa Rica", "Estados Unidos", "México", "España", "Argentina", "Chile", "Perú",
  "Ecuador", "República Dominicana", "Canadá", "Brasil", "Guatemala", "El Salvador", "Honduras", "Nicaragua", "Cuba",
  "Puerto Rico", "Francia", "Italia", "Alemania", "Reino Unido", "Países Bajos", "China", "Otro",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

/** Day of the week (0 = Sunday) of a yyyy-mm-dd date. */
export const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
export const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Times a guest can choose on a day. With opening hours: every slot from opening until
 * `last_before_close` minutes before closing (late nights stop at 23:30). Without hours:
 * every slot from 08:00 to 22:00. Today drops the times inside the minimum notice.
 */
export function slotsFor(date: string, hours: DayHours[], s: ReservationSettings, now: { today: string; min: number }): string[] {
  let open = 8 * 60, close = 22 * 60 + s.last_before_close;
  if (hours.length === 7) {
    const h = hours[weekday(date)];
    if (!h) return [];
    open = toMin(h.open);
    close = toMin(h.close) <= open ? 24 * 60 : toMin(h.close);
  }
  const last = Math.min(close - s.last_before_close, 23 * 60 + 30);
  const first = date === now.today ? Math.max(open, now.min + s.min_notice_hours * 60) : open;
  const out: string[] = [];
  for (let m = Math.ceil(first / s.slot_minutes) * s.slot_minutes; m <= last; m += s.slot_minutes) out.push(toTime(m));
  return out;
}

/** wa.me digits from what a guest typed: 7–8 digits are Panamá; with + or 9+ digits, as written. */
export function phoneDigits(v: string | null | undefined) {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length < 7 || d.length > 15) return null;
  return d.length <= 8 ? `507${d}` : d;
}
