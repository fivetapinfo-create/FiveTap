import type { Metadata } from "next";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Check, StarSolid } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { guestClosed, tagByCode } from "@/lib/data";
import { guestRequest } from "../request";
import { Inactive } from "../Inactive";
import { joinClub } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ s?: string; listo?: string; error?: string }>;
};

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;

export default async function ClubPage({ params, searchParams }: Props) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={copy} />;

  const b = tag.business;
  const q = sp.s === "q" ? "?s=q" : "";

  if (sp.listo) {
    return (
      <main className="guest">
        <div className="guest-wrap" style={{ textAlign: "center" }}>
          <div className="check-badge rise" style={i(0)}><Check /></div>
          <h1 className="guest-title rise" style={{ ...i(1), marginTop: 0 }}>{copy.clubThanksTitle}</h1>
          <p className="guest-lead rise" style={i(2)}>{copy.clubThanksBody}</p>
          <div className="guest-actions">
            <a className="choice rise" style={{ ...i(3), justifyContent: "center" }} href={`/t/${code}/go${q}`}>
              <StarSolid /> {copy.thanksReview}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const error =
    sp.error === "telefono" ? copy.clubErrorPhone : sp.error === "consentimiento" ? copy.clubErrorConsent : sp.error ? copy.errorGeneric : null;

  return (
    <main className="guest">
      <div className="guest-wrap">
        <a className="guest-back" href={`/t/${code}${q}${q ? "&" : "?"}preview=1`}>← {copy.back}</a>
        <div className="rise" style={{ ...i(0), display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <span className="guest-name">{b.name}</span>
        </div>
        <h1 className="guest-title rise" style={i(1)}>{copy.clubTitle}</h1>
        <p className="guest-lead rise" style={i(2)}>{copy.clubLead}</p>

        <form action={joinClub} className="guest-form rise" style={i(3)}>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="s" value={sp.s === "q" ? "q" : ""} />
          <label className="hp" aria-hidden="true">
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <label className="field">
            <span>{copy.clubName}</span>
            <input className="input" name="name" required maxLength={80} autoComplete="given-name" />
          </label>
          <label className="field">
            <span>{copy.clubPhone}</span>
            <input className="input" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="6000-0000" />
          </label>
          <fieldset className="field club-bday">
            <span>{copy.clubBirthday}</span>
            <div className="club-bday-row">
              <select className="select" name="day" defaultValue="" aria-label={copy.clubDay}>
                <option value="">{copy.clubDay}</option>
                {Array.from({ length: 31 }, (_, d) => <option key={d} value={d + 1}>{d + 1}</option>)}
              </select>
              <select className="select" name="month" defaultValue="" aria-label={copy.clubMonth}>
                <option value="">{copy.clubMonth}</option>
                {copy.months.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
              </select>
            </div>
          </fieldset>
          <label className="club-consent">
            <input type="checkbox" name="consent" value="1" required />
            <span>
              {copy.clubConsent.replace("{name}", b.name)} <a className="link-u" href="/privacidad" target="_blank" rel="noreferrer">{copy.clubPrivacy}</a>
            </span>
          </label>
          <SubmitButton className="btn btn-dark btn-block" pending={copy.sending}>
            {copy.clubJoin}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
