import type { Metadata } from "next";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Check, Gift, StarSolid } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { tagByCode } from "@/lib/data";
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

export default async function MessagePage({ params, searchParams }: Props) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || !tag.active || tag.business.status === "canceled") return <Inactive copy={copy} />;

  const b = tag.business;
  const q = sp.s === "q" ? "?s=q" : "";

  if (sp.enviado) {
    return (
      <main className="guest">
        <div className="guest-wrap" style={{ textAlign: "center" }}>
          <div className="check-badge rise" style={i(0)}><Check /></div>
          <h1 className="guest-title rise" style={{ ...i(1), marginTop: 0 }}>{copy.thanksTitle}</h1>
          <p className="guest-lead rise" style={i(2)}>{copy.thanksBody}</p>
          <div className="guest-actions">
            <a className="choice rise" style={{ ...i(3), justifyContent: "center" }} href={`/t/${code}/go${q}`}>
              <StarSolid /> {copy.thanksReview}
            </a>
          </div>
          <a className="guest-club rise" style={i(4)} href={`/t/${code}/club${q}`}>
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
              {sp.error === "corto" ? copy.errorShort : copy.errorGeneric}
            </p>
          )}
          <label className="field">
            <span>{copy.messageLabel}</span>
            <textarea className="textarea" name="message" required minLength={3} maxLength={1500} placeholder={copy.messagePlaceholder} autoFocus />
          </label>
          <label className="field">
            <span>{copy.nameLabel}</span>
            <input className="input" name="name" maxLength={80} autoComplete="given-name" />
          </label>
          <label className="field">
            <span>{copy.phoneLabel}</span>
            <input className="input" name="phone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="6000-0000" />
          </label>
          <SubmitButton className="btn btn-dark btn-block" pending={copy.sending}>
            {copy.send}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
