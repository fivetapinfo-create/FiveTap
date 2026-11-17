import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { SubmitButton } from "@/components/SubmitButton";
import { guestClosed, tagByCode } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { programFor } from "@/lib/loyalty-cards";
import { Inactive } from "../Inactive";
import { guestRequest } from "../request";
import { joinLoyalty } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;

export default async function JoinCardPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={copy} />;
  if (!(await can(tag.business, "loyalty"))) redirect(`/t/${code}`);
  const program = await programFor(tag.business_id);
  if (!program.enabled) redirect(`/t/${code}`);
  const b = tag.business;
  const club = await can(b, "club");
  const error = sp.error === "telefono" ? copy.clubErrorPhone : sp.error === "consentimiento" ? copy.clubErrorConsent : sp.error ? copy.errorGeneric : null;

  return (
    <main className="guest">
      <div className="guest-wrap">
        <a className="guest-back" href={`/t/${code}?preview=1`}>← {copy.back}</a>
        <div className="rise" style={{ ...i(0), display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <span className="guest-name">{b.name}</span>
        </div>
        <h1 className="guest-title rise" style={i(1)}>{copy.cardTitle}</h1>
        <p className="guest-lead rise" style={i(2)}>{copy.cardLead.replace("{n}", String(program.stamps_needed)).replace("{reward}", program.reward)}</p>
        <ol className="lc-preview rise" style={i(3)} aria-hidden="true">
          {Array.from({ length: program.stamps_needed }, (_, k) => <li key={k} />)}
        </ol>
        <form action={joinLoyalty} className="guest-form rise" style={i(4)}>
          <input type="hidden" name="code" value={code} />
          <label className="hp" aria-hidden="true">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <label className="field"><span>{copy.clubName}</span><input className="input" name="name" required maxLength={80} autoComplete="given-name" /></label>
          <label className="field"><span>{copy.clubPhone}</span><input className="input" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="6000-0000" /></label>
          <label className="check"><input type="checkbox" name="consent" value="1" required /><span>{copy.cardConsent.replace("{name}", b.name)}</span></label>
          {club && <label className="check"><input type="checkbox" name="marketing" value="1" /><span>{copy.cardMarketing.replace("{name}", b.name)}</span></label>}
          <SubmitButton className="btn btn-dark btn-block" pending="…">{copy.cardJoin}</SubmitButton>
          <a className="muted" style={{ fontSize: 13 }} href="/privacidad">{copy.clubPrivacy}</a>
        </form>
      </div>
    </main>
  );
}
