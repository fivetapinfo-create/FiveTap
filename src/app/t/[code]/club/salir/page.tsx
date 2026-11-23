import type { Metadata } from "next";
import { BusinessLogo } from "@/components/BusinessLogo";
import { Check } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { tagByCode } from "@/lib/data";
import { guestRequest } from "../../request";
import { Inactive } from "../../Inactive";
import { leaveClub } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ listo?: string; error?: string }> };

/** Leaving the club is as easy as joining: one number, one button, data deleted. */
export default async function LeaveClub({ params, searchParams }: Props) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  // Works even if the venue is paused or no longer has the club: leaving is always possible.
  if (!tag) return <Inactive copy={copy} />;
  const b = tag.business;

  if (sp.listo) {
    return (
      <main className="guest">
        <div className="guest-wrap" style={{ textAlign: "center" }}>
          <div className="check-badge"><Check /></div>
          <h1 className="guest-title" style={{ marginTop: 0 }}>{copy.clubLeftTitle}</h1>
          <p className="guest-lead">{copy.clubLeftBody}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="guest">
      <div className="guest-wrap">
        <a className="guest-back" href={`/t/${code}/club`}>← {copy.back}</a>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <span className="guest-name">{b.name}</span>
        </div>
        <h1 className="guest-title">{copy.clubLeaveTitle}</h1>
        <p className="guest-lead">{copy.clubLeaveLead.replace("{name}", b.name)}</p>
        <form action={leaveClub} className="guest-form">
          <input type="hidden" name="code" value={code} />
          <label className="hp" aria-hidden="true">
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {sp.error && <p className="alert alert-error" role="alert">{copy.clubErrorPhone}</p>}
          <label className="field">
            <span>{copy.clubPhone}</span>
            <input className="input" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="6000-0000" />
          </label>
          <SubmitButton className="btn btn-dark btn-block" pending={copy.sending}>{copy.clubLeaveButton}</SubmitButton>
        </form>
        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
          <a className="link-u" href="/privacidad">{copy.clubPrivacy}</a>
        </p>
      </div>
    </main>
  );
}
