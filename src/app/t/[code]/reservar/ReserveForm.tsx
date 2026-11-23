"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { DayHours } from "@/lib/experience-shape";
import type { Copy } from "@/lib/i18n";
import { COUNTRIES, addDaysIso, slotsFor, type ReservationSettings } from "@/lib/reservation-rules";
import { sendReservation } from "./actions";

function Send({ label, pending }: { label: string; pending: string }) {
  const s = useFormStatus();
  return <button type="submit" className="btn btn-dark btn-block" disabled={s.pending}>{s.pending ? pending : label}</button>;
}

const clock = (t: string, lang: "es" | "en") => {
  const h = Number(t.slice(0, 2)), m = t.slice(3, 5);
  return `${h % 12 || 12}:${m} ${h >= 12 ? (lang === "es" ? "p. m." : "PM") : lang === "es" ? "a. m." : "AM"}`;
};

/** Day, time (only the venue's open slots), party, contact and where the guest comes from. */
export function ReserveForm({ code, copy, lang, hours, settings, today, nowMin, error, waHref }: {
  code: string; copy: Copy; lang: "es" | "en"; hours: DayHours[]; settings: ReservationSettings; today: string; nowMin: number; error?: string; waHref: string | null;
}) {
  const [date, setDate] = useState("");
  const slots = useMemo(() => (date ? slotsFor(date, hours, settings, { today, min: nowMin }) : []), [date, hours, settings, today, nowMin]);
  const errText = error ? (copy.rErr as Record<string, string>)[error] ?? copy.rErr.envio : null;

  return (
    <form action={sendReservation} className="guest-form ob-form rv-form">
      {errText && <p className="alert alert-error" role="alert">{errText}</p>}
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="lang" value={lang} />
      <label className="hp" aria-hidden="true">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="grid-2">
        <label className="field"><span>{copy.rDate}</span><input className="input" type="date" name="date" required min={today} max={addDaysIso(today, settings.days_ahead)} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field">
          <span>{copy.rTime}</span>
          <select className="select" name="time" required disabled={!date || slots.length === 0} key={date}>
            <option value="">{!date ? copy.rPickDay : slots.length ? "—" : copy.rNoTimes}</option>
            {slots.map((t) => <option key={t} value={t}>{clock(t, lang)}</option>)}
          </select>
        </label>
      </div>
      {date && slots.length === 0 && <p className="muted" style={{ fontSize: 14 }}>{copy.rNoTimes}</p>}
      <label className="field">
        <span>{copy.rParty}</span>
        <select className="select" name="party" defaultValue="2" required>
          {Array.from({ length: settings.max_party }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <small>{waHref ? <a href={waHref} style={{ textDecoration: "underline" }}>{copy.rBig.replace("{n}", String(settings.max_party))}</a> : copy.rBig.replace("{n}", String(settings.max_party))}</small>
      </label>
      <label className="field"><span>{copy.rName}</span><input className="input" name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="field"><span>{copy.rPhone}</span><input className="input" name="phone" type="tel" inputMode="tel" required maxLength={30} autoComplete="tel" placeholder="6000-0000" /><small>{copy.rPhoneHint}</small></label>
      <label className="field">
        <span>{copy.rCountry}</span>
        <select className="select" name="country" defaultValue="Panamá">
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="field"><span>{copy.rNotes}</span><textarea className="textarea" name="notes" maxLength={400} placeholder={copy.rNotesPh} style={{ minHeight: 70 }} /></label>
      <Send label={copy.rSend} pending={copy.rSending} />
      <p className="muted data-note">{copy.dataNote} <a className="link-u" href="/privacidad" target="_blank" rel="noreferrer">{copy.clubPrivacy}</a></p>
    </form>
  );
}
