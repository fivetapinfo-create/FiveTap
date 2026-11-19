import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { RateWaiter } from "@/components/RateWaiter";
import { StaffPicker } from "@/components/StaffPicker";
import { palette } from "@/lib/brand";
import { guestClosed, tagByCode } from "@/lib/data";
import { can } from "@/lib/entitlements";
import { staffFor, staffMember } from "@/lib/staff";
import { Inactive } from "../Inactive";
import { guestRequest } from "../request";
import { rateStaff } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** "Who served you today?" from a table card, or straight to the person from their own card. */
export default async function ServicePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ p?: string }> }) {
  const [{ code }, sp, { copy }] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={copy} />;
  if (!(await can(tag.business, "team"))) redirect(`/t/${code}`);
  const b = tag.business;
  const pal = palette(b.brand_color, b.brand_accent);
  const style = { "--brand": pal.custom ? pal.brand : undefined, "--on-brand": pal.custom ? pal.onBrand : undefined, "--gx-accent": pal.accent, "--gx-accent-soft": pal.accentSoft, "--gx-tint": pal.tint ?? undefined } as React.CSSProperties;
  const own = tag.kind === "waiter" && tag.staff_id ? await staffMember(b.id, tag.staff_id) : null;
  const person = own?.active ? own : sp.p ? await staffMember(b.id, sp.p) : null;

  if (!person || !person.active) {
    const team = await staffFor(b.id, { activeOnly: true, branchId: tag.branch_id ?? null });
    if (!team.length) redirect(`/t/${code}`);
    return (
      <main className="guest gx rw" style={style}>
        <div className="guest-wrap">
          <a className="guest-back" href={`/t/${code}?preview=1`}>← {copy.back}</a>
          <div className="rw-head">
            <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
            <span className="guest-name">{b.name}</span>
          </div>
          <h1 className="guest-title">{copy.wWho}</h1>
          <p className="guest-lead">{copy.wWhoHint}</p>
          <StaffPicker logoUrl={b.logo_url} people={team.map((s) => ({ ref: s.ref, name: s.name, title: s.title, avatar: s.avatar, href: `/t/${code}/atencion?p=${s.ref}` }))} />
        </div>
      </main>
    );
  }

  return (
    <main className="guest gx rw" style={style}>
      <div className="guest-wrap">
        {!own && <a className="guest-back" href={`/t/${code}/atencion`}>← {copy.wOther}</a>}
        <RateWaiter
          action={rateStaff}
          hidden={{ code, p: person.ref }}
          person={{ name: person.name, title: person.title, message: person.message, avatar: person.avatar }}
          logoUrl={b.logo_url}
          business={b.name}
          googleHref={`/t/${code}/go`}
          homeHref={`/t/${code}?preview=1`}
          copy={{
            rate: copy.wRate.replace("{name}", person.name.split(" ")[0]!), comment: copy.wComment, issueQ: copy.wIssueQ, send: copy.wSend, pick: copy.wPickStars,
            say5: copy.wSay5, say4: copy.wSay4, say3: copy.wSay3, sayLow: copy.wSayLow, dup: copy.wDup.replace("{name}", person.name.split(" ")[0]!),
            private: copy.wPrivate, googleQ: copy.wGoogleQ, google: copy.wGoogle, back: copy.wBack, error: copy.errorGeneric, issues: copy.wIssues,
          }}
        />
      </div>
    </main>
  );
}
