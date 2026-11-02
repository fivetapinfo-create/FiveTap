import { onColor, safeColor } from "@/lib/brand";
import type { Copy } from "@/lib/i18n";
import { BusinessLogo } from "./BusinessLogo";
import { Chat, Gift, StarSolid } from "./Icons";
import { LogoMark } from "./Logo";

export type GuestBusiness = { name: string; logo_url: string | null; brand_color: string };

/** The page a guest sees after tapping. One question, two choices. */
export function GuestCard({
  business,
  copy,
  reviewHref,
  managerHref,
  clubHref,
  embedded = false,
}: {
  business: GuestBusiness;
  copy: Copy;
  reviewHref: string;
  managerHref: string;
  /** Optional third, quieter action: join the venue's WhatsApp club. */
  clubHref?: string;
  /** Rendered inside another page (landing mockup): no <main>, links inert. */
  embedded?: boolean;
}) {
  const brand = safeColor(business.brand_color, "#0a0a0a");
  // Black is the FiveTap default; only a real brand color overrides the theme.
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = custom ? ({ "--brand": brand, "--on-brand": onColor(brand) } as React.CSSProperties) : undefined;
  const Root = embedded ? "div" : "main";
  const tab = embedded ? -1 : undefined;

  return (
    <Root className="guest">
      <div className="guest-wrap">
        <header className="guest-head">
          <div className="rise" style={{ "--i": 0 } as React.CSSProperties}>
            <BusinessLogo name={business.name} logoUrl={business.logo_url} color={brand} />
          </div>
          <p className="guest-name rise" style={{ "--i": 1 } as React.CSSProperties}>{business.name}</p>
          <h1 className="guest-q rise" style={{ "--i": 2 } as React.CSSProperties}>{copy.question}</h1>
        </header>

        <nav className="guest-actions" aria-label={copy.question}>
          {/* Plain <a>: the click is counted server-side and must never be prefetched. */}
          <a className="choice choice-primary rise" href={reviewHref} tabIndex={tab} style={{ ...style, "--i": 3 } as React.CSSProperties}>
            <StarSolid />
            {copy.review}
          </a>
          <a className="choice rise" href={managerHref} tabIndex={tab} style={{ "--i": 4 } as React.CSSProperties}>
            <Chat />
            {copy.manager}
          </a>
        </nav>

        {clubHref && (
          <a className="guest-club rise" href={clubHref} tabIndex={tab} style={{ "--i": 5 } as React.CSSProperties}>
            <Gift /> {copy.club}
          </a>
        )}

        <footer className="guest-foot">
          <span className="powered">
            <LogoMark size={12} /> FiveTap
          </span>
        </footer>
      </div>
    </Root>
  );
}
