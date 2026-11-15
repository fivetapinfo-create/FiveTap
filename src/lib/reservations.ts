import "server-only";
import { todayPanama } from "./agenda";
import { asExperience, panamaNow } from "./experience-shape";
import { sendPush } from "./push";
import { COUNTRIES, addDaysIso, asSettings, phoneDigits, slotsFor, type ReservationSettings } from "./reservation-rules";
import { db } from "./supabase";

// Reservations: requested by guests from a plaque or written down by the venue. Every
// query is scoped to one business.

export type ReservationStatus = "pending" | "confirmed" | "canceled" | "attended" | "no_show";
export type Reservation = {
  id: string; business_id: string; tag_id: string | null; token: string; customer_name: string; phone: string | null;
  party_size: number; reserved_on: string; reserved_at: string; country: string | null; notes: string | null;
  status: ReservationStatus; source: "nfc" | "manual"; cancel_reason: string | null; created_at: string; updated_at: string;
};
export const R_STATUS: Record<ReservationStatus, string> = { pending: "Por confirmar", confirmed: "Confirmada", canceled: "Cancelada", attended: "Llegó", no_show: "No vino" };

/** The business's hours (published experience first, then the draft) and its reservation settings. */
export async function bookingRules(businessId: string) {
  const { data } = await db().from("businesses").select("experience, experience_draft, reservation_settings").eq("id", businessId).maybeSingle();
  const exp = asExperience(data?.experience ?? data?.experience_draft ?? null);
  return { hours: exp.hours, settings: asSettings(data?.reservation_settings) };
}

type Input = { name: string; phone: string | null; party: number; date: string; time: string; country: string | null; notes: string | null };

/** Checks a reservation against the business's days, hours and settings. Returns an error key or null. */
function check(i: Input, hours: ReturnType<typeof asExperience>["hours"], s: ReservationSettings, guest: boolean): string | null {
  if (!i.name) return "nombre";
  if (guest && !phoneDigits(i.phone)) return "telefono";
  if (!(Number.isInteger(i.party) && i.party >= 1 && i.party <= (guest ? s.max_party : 200))) return "personas";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) || !/^\d{2}:\d{2}$/.test(i.time)) return "fecha";
  const today = todayPanama();
  if (i.date < today || (guest && i.date > addDaysIso(today, s.days_ahead))) return "fecha";
  if (guest && !slotsFor(i.date, hours, s, { today, min: panamaNow().min }).includes(i.time)) return "hora";
  if (i.country && !COUNTRIES.includes(i.country)) return "pais";
  return null;
}

/** A guest requests a reservation from a plaque. It stays "por confirmar" until the venue confirms. */
export async function requestReservation(tag: { id: string; business_id: string; label: string }, i: Input) {
  const { hours, settings } = await bookingRules(tag.business_id);
  const err = check(i, hours, settings, true);
  if (err) throw new Error(err);
  const { data, error } = await db().from("reservations").insert({
    business_id: tag.business_id, tag_id: tag.id, customer_name: i.name, phone: i.phone, party_size: i.party,
    reserved_on: i.date, reserved_at: i.time, country: i.country, notes: i.notes,
  }).select("token").single();
  if (error) throw new Error(error.message);
  const { data: b } = await db().from("businesses").select("owner_token").eq("id", tag.business_id).maybeSingle();
  await sendPush(
    { role: ["owner", "manager"], businessId: tag.business_id },
    { title: `Reserva por confirmar · ${i.party} ${i.party === 1 ? "persona" : "personas"}`, body: `${i.name} · ${i.date} a las ${i.time}${i.country && i.country !== "Panamá" ? ` · desde ${i.country}` : ""}`, url: b?.owner_token ? `/mi/${b.owner_token}/reservas` : "/" },
  ).catch(() => 0);
  return data.token as string;
}

/** The venue writes down a reservation (by phone or in person): confirmed from the start. */
export async function addManualReservation(businessId: string, i: Input) {
  const { hours, settings } = await bookingRules(businessId);
  const err = check(i, hours, settings, false);
  if (err) throw new Error(err === "nombre" ? "Escribe el nombre." : err === "personas" ? "Revisa cuántas personas." : err === "fecha" ? "Revisa la fecha: no puede ser en el pasado." : "Revisa los datos.");
  const { error } = await db().from("reservations").insert({
    business_id: businessId, customer_name: i.name, phone: i.phone, party_size: i.party, reserved_on: i.date, reserved_at: i.time,
    country: i.country, notes: i.notes, status: "confirmed", source: "manual",
  });
  if (error) throw new Error(error.message);
}

/** Reservations of a business between two days (inclusive), in order. */
export async function reservationsBetween(businessId: string, from: string, to: string) {
  const { data } = await db().from("reservations").select("*").eq("business_id", businessId).gte("reserved_on", from).lte("reserved_on", to).order("reserved_on").order("reserved_at");
  return (data ?? []) as Reservation[];
}

export async function reservationByToken(businessId: string, token: string) {
  if (!/^[0-9a-f]{24}$/.test(token)) return null;
  const { data } = await db().from("reservations").select("*").eq("business_id", businessId).eq("token", token).maybeSingle();
  return (data as Reservation | null) ?? null;
}

const ALLOWED: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["attended", "no_show", "canceled"],
  canceled: ["pending"],
  attended: ["confirmed"],
  no_show: ["confirmed"],
};

/** Confirms, cancels or closes a reservation (only of this business). */
export async function setReservationStatus(businessId: string, id: string, to: ReservationStatus, reason?: string | null) {
  const { data: r } = await db().from("reservations").select("status").eq("id", id).eq("business_id", businessId).maybeSingle();
  if (!r) throw new Error("Reserva no encontrada.");
  if (!ALLOWED[r.status as ReservationStatus].includes(to)) throw new Error("Esa reserva ya cambió. Actualiza la página.");
  const { error } = await db().from("reservations").update({ status: to, cancel_reason: to === "canceled" ? reason || null : null, updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

/** What the owner's home shows: today's reservations and how many wait for confirmation. */
export async function reservationGlance(businessId: string) {
  const today = todayPanama();
  const [{ count: todayCount }, { count: pending }] = await Promise.all([
    db().from("reservations").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("reserved_on", today).in("status", ["pending", "confirmed"]),
    db().from("reservations").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "pending").gte("reserved_on", today),
  ]);
  return { today: todayCount ?? 0, pending: pending ?? 0 };
}

/** Last 30 days and next 30: people, where guests come from, busiest weekdays, no-shows. */
export async function reservationStats(businessId: string) {
  const today = todayPanama();
  const past = await reservationsBetween(businessId, addDaysIso(today, -30), addDaysIso(today, -1));
  const next = (await reservationsBetween(businessId, today, addDaysIso(today, 30))).filter((r) => r.status === "pending" || r.status === "confirmed");
  const all = [...past.filter((r) => r.status !== "canceled"), ...next];
  const tally = (key: (r: Reservation) => string) => [...all.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>())].sort((a, z) => z[1] - a[1]);
  const closed = past.filter((r) => r.status === "attended" || r.status === "no_show");
  return {
    upcoming: next.length,
    upcomingPeople: next.reduce((n, r) => n + r.party_size, 0),
    countries: tally((r) => r.country || "Sin indicar"),
    weekdays: tally((r) => String(new Date(`${r.reserved_on}T12:00:00Z`).getUTCDay())),
    noShowRate: closed.length ? Math.round((past.filter((r) => r.status === "no_show").length / closed.length) * 100) : null,
    total: all.length,
  };
}

/** Saves the venue's booking settings. */
export async function saveReservationSettings(businessId: string, s: Partial<ReservationSettings>) {
  const settings = asSettings(s);
  const { error } = await db().from("businesses").update({ reservation_settings: settings }).eq("id", businessId);
  if (error) throw new Error(error.message);
}
