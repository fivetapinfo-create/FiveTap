import type { Metadata } from "next";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Check, Gift, StarSolid } from "@/components/Icons";
import { RatingStars } from "@/components/RatingStars";
import { SubmitButton } from "@/components/SubmitButton";
import { guestClosed, tagByCode } from "@/lib/data";
import { COPY } from "@/lib/i18n";
import { waLink } from "@/lib/phone";
import { db } from "@/lib/supabase";
import { guestRequest } from "../request";
import { Inactive } from "../Inactive";
import { sendFeedback } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ s?: string; enviado?: string; error?: string }>;
};

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Private feedback: five stars and a comment. It is saved and reaches FiveTap Business at
 * once; the thank-you page can also open WhatsApp with the comment ready for the manager.
 * The Google review button stays the same for everyone, whatever the stars.
 */
export default async function MessagePage({ params, searchParams }: Props) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={copy} />;

  const b = tag.business;
  const q = sp.s === "q" ? "?s=q" : "";

  if (sp.enviado) {
    // The comment just saved, to prepare the optional WhatsApp to the manager (always in Spanish: it is for the venue).
    const sent = UUID.test(sp.enviado)
      ? ((await db().from("feedback").select("message, rating, created_at, business_id").eq("id", sp.enviado).maybeSingle()).data as { message: string; rating: number | null; created_at: string; business_id: string } | null)
      : null;
    const mine = sent && sent.business_id === b.id ? sent : null;
    const when = mine ? new Date(mine.created_at).toLocaleString("es-PA", { timeZone: "America/Panama", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    const wa =
      mine && b.manager_phone
        ? `${waLink(b.manager_phone)}?text=${encodeURIComponent(
            [
              `Comentario privado · ${b.name}`,
              mine.rating ? `Valoración: ${"★".repeat(mine.rating)}${"☆".repeat(5 - mine.rating)} (${mine.rating}/5 · ${COPY.es.ratingLabels[mine.rating - 1]})` : null,
              `Comentario: ${mine.message}`,
              `Fecha: ${when}`,
              `Lugar: ${tag.label} · ID ${b.slug}`,
              "— Enviado desde FiveTap",
            ].filter(Boolean).join("\n"),
          )}`
        : null;
    return (
      <main className="guest">
        <div className="guest-wrap" style={{ textAlign: "center" }}>
          <div className="check-badge rise" style={i(0)}><Check /></div>
          <h1 className="guest-title rise" style={{ ...i(1), marginTop: 0 }}>{copy.thanksTitle}</h1>
          <p className="guest-lead rise" style={i(2)}>{copy.thanksBody}</p>
          {wa && (
            <div className="guest-actions guest-wa rise" style={i(3)}>
              <a className="choice" style={{ justifyContent: "center" }} href={wa}>
                <WhatsAppIcon /> {copy.thanksWhatsApp}
              </a>
              <small className="guest-note">{copy.thanksWhatsAppNote}</small>
            </div>
          )}
          <div className="guest-actions" style={{ marginTop: wa ? 12 : 40 }}>
            <a className="choice rise" style={{ ...i(4), justifyContent: "center" }} href={`/t/${code}/go${q}`}>
              <StarSolid /> {copy.thanksReview}
            </a>
          </div>
          <a className="guest-club rise" style={i(5)} href={`/t/${code}/club${q}`}>
            <Gift /> {copy.club}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="guest">
      <div className="guest-wrap">
        <a className="guest-back" href={`/t/${code}${q}${q ? "&" : "?"}preview=1`}>← {copy.back}</a>
        <div className="rise" style={{ ...i(0), display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <span className="guest-name">{b.name}</span>
        </div>
        <h1 className="guest-title rise" style={i(1)}>{copy.formTitle}</h1>
        <p className="guest-lead rise" style={i(2)}>{copy.formLead}</p>

        <form action={sendFeedback} className="guest-form rise" style={i(3)}>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="s" value={sp.s === "q" ? "q" : ""} />
          <label className="hp" aria-hidden="true">
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {sp.error && (
            <p className="alert alert-error" role="alert">
              {sp.error === "estrellas" ? copy.errorRating : sp.error === "corto" ? copy.errorShort : copy.errorGeneric}
            </p>
          )}
          <RatingStars labels={copy.ratingLabels} pick={copy.ratingPick} invalid={sp.error === "estrellas"} />
          <label className="field">
            <span>{copy.messageLabel}</span>
            <textarea className="textarea" name="message" required minLength={3} maxLength={1500} placeholder={copy.messagePlaceholder} />
          </label>
          <details className="guest-reply">
            <summary>{copy.replyToggle}</summary>
            <div className="guest-reply-fields">
              <label className="field">
                <span>{copy.nameLabel}</span>
                <input className="input" name="name" maxLength={80} autoComplete="given-name" />
              </label>
              <label className="field">
                <span>{copy.phoneLabel}</span>
                <input className="input" name="phone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="6000-0000" />
              </label>
            </div>
          </details>
          <SubmitButton className="btn btn-dark btn-block" pending={copy.sending}>
            {copy.send}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.6a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.6z" />
      <path d="M9 8.8c.2 1.9 1.6 4.2 3.7 5.4.6.3 1.2.1 1.6-.4l.4-.5-1.6-1-.6.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.6-1-1.6-.5.4c-.5.4-.8.9-.7 1.6" />
    </svg>
  );
}
