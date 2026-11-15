import { onColor, safeColor } from "@/lib/brand";
import { openState, socialUrl, waDigits, type CatalogItem, type Experience, type Promotion } from "@/lib/experience-shape";
import type { Copy, Lang } from "@/lib/i18n";
import { BusinessLogo } from "./BusinessLogo";
import { Bag, Calendar, Camera, Chat, Clock, Gift, Globe, LinkIcon, Phone, Route, StarSolid, Tag } from "./Icons";
import { LogoMark } from "./Logo";
import type { GuestBusiness } from "./GuestCard";

type Props = {
  business: GuestBusiness;
  experience: Experience;
  promos: Promotion[];
  items: CatalogItem[];
  copy: Copy;
  lang: Lang;
  reviewHref: string;
  managerHref: string;
  clubHref?: string;
  /** Ordering from the plaque, when the business has the Orders module. */
  orderHref?: string;
  /** Booking from the plaque, when the business has the Reservations module. */
  reserveHref?: string;
  /** Founder preview: links inside the page do nothing, nothing is counted. */
  preview?: boolean;
};

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;
const fill = (s: string, k: string, v: string) => s.replace(`{${k}}`, v);

/** "22:00" → "10:00 p. m." (es) or "10:00 PM" (en). */
function clock(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = (h ?? 0) >= 12 ? (lang === "es" ? "p. m." : "PM") : lang === "es" ? "a. m." : "AM";
  const h12 = ((h ?? 0) % 12) || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}
function day(iso: string, lang: Lang) {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, mo! - 1, d!, 12)).toLocaleDateString(lang === "es" ? "es-PA" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * The page a guest sees after tapping a plaque of a business with its experience
 * published: its cover and identity, the review card (same as always, never filtered),
 * and only the sections the business turned on and filled in.
 */
export function GuestExperience({ business, experience: e, promos, items, copy, lang, reviewHref, managerHref, clubHref, orderHref, reserveHref, preview }: Props) {
  const brand = safeColor(business.brand_color, "#0a0a0a");
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = { "--brand": custom ? brand : undefined, "--on-brand": custom ? onColor(brand) : undefined } as React.CSSProperties;
  const link = (href: string | null) => (preview ? "#" : href ?? "#");
  const state = openState(e.hours);
  const wa = waDigits(e.whatsapp);
  const tel = e.phone ? e.phone.replace(/[^\d+]/g, "") : null;
  const maps = e.maps_url ?? (e.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.address} ${business.name}`)}` : null);
  const socials = [
    { k: "instagram" as const, label: "Instagram", url: socialUrl("instagram", e.instagram), icon: <Camera /> },
    { k: "facebook" as const, label: "Facebook", url: socialUrl("facebook", e.facebook), icon: <LinkIcon /> },
    { k: "tiktok" as const, label: "TikTok", url: socialUrl("tiktok", e.tiktok), icon: <LinkIcon /> },
    { k: "web" as const, label: copy.xWebsite, url: e.website, icon: <Globe /> },
  ].filter((s) => s.url);
  const s = e.sections;
  const showPromos = s.promos && promos.length > 0;
  const showCatalog = s.catalog && items.length > 0;
  const showGallery = s.gallery && e.gallery.length > 0;
  const showInfo = s.info && Boolean(e.about || e.hours.length || e.policies);
  const showLocation = s.location && Boolean(e.address || e.maps_url);
  const showContact = s.contact && Boolean(wa || tel || socials.length);
  const groups = [...new Set(items.map((x) => x.category || ""))].map((c) => ({ name: c || (items.some((x) => x.category) ? copy.xOther : ""), list: items.filter((x) => (x.category || "") === c) }));
  const nav = [
    showPromos && { id: "promos", label: copy.xPromos },
    showCatalog && { id: "catalogo", label: e.catalog_title || copy.xCatalog },
    showGallery && { id: "fotos", label: copy.xGallery },
    showInfo && { id: "info", label: copy.xInfo },
    showLocation && { id: "ubicacion", label: copy.xLocation },
    showContact && { id: "contacto", label: copy.xContact },
  ].filter(Boolean) as { id: string; label: string }[];
  const Ext = ({ href, className, children }: { href: string | null; className: string; children: React.ReactNode }) => (
    <a className={className} href={link(href)} {...(preview ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{children}</a>
  );

  return (
    <main className="guest gx" style={style}>
      <header className={`gx-hero${e.cover_url ? " has-cover" : ""}`}>
        {e.cover_url ? <img className="gx-cover" src={e.cover_url} alt="" /> : <div className="gx-cover gx-cover-brand" aria-hidden="true" />}
        <div className="gx-id">
          <div className="gx-logo rise" style={i(0)}>
            <BusinessLogo name={business.name} logoUrl={business.logo_url} color={brand} />
          </div>
          <h1 className="gx-name rise" style={i(1)}>{business.name}</h1>
          {e.tagline && <p className="gx-tagline rise" style={i(2)}>{e.tagline}</p>}
          {state && (
            <p className={`gx-state rise${state.open ? " open" : ""}`} style={i(3)}>
              <Clock />
              <b>{state.open ? copy.xOpen : copy.xClosed}</b>
              {state.open && state.until ? <span>· {fill(copy.xClosesAt, "t", clock(state.until, lang))}</span> : null}
              {!state.open && state.next ? <span>· {fill(copy.xOpensAt, "t", clock(state.next, lang))}</span> : null}
            </p>
          )}
        </div>
      </header>

      <div className="guest-wrap gx-wrap">
        {(orderHref || reserveHref) && (
          <div className={`gx-mods rise${orderHref && reserveHref ? " two" : ""}`} style={i(4)}>
            {orderHref && <a className="gx-order" href={preview ? "#" : orderHref}><Bag /><span>{copy.oOrder}</span><b aria-hidden="true">→</b></a>}
            {reserveHref && <a className={`gx-order${orderHref ? " gx-order-alt" : ""}`} href={preview ? "#" : reserveHref}><Calendar /><span>{copy.rReserve}</span><b aria-hidden="true">→</b></a>}
          </div>
        )}
        {(wa || tel || maps) && (
          <div className="gx-quick rise" style={i(4)}>
            {wa && <Ext className="gx-quick-btn" href={`https://wa.me/${wa}`}><Chat /><span>{copy.xWhatsApp}</span></Ext>}
            {tel && <a className="gx-quick-btn" href={preview ? "#" : `tel:${tel}`}><Phone /><span>{copy.xCall}</span></a>}
            {maps && s.location && <Ext className="gx-quick-btn" href={maps}><Route /><span>{copy.xDirections}</span></Ext>}
          </div>
        )}

        <section className="gx-review rise" style={i(5)} aria-labelledby="gx-q">
          <h2 id="gx-q" className="gx-q">{copy.question}</h2>
          <nav className="guest-actions gx-actions" aria-label={copy.question}>
            {/* Plain <a>: the click is counted server-side and must never be prefetched. */}
            <a className="choice choice-primary choice-rate" href={reviewHref}>
              <span>{copy.review}</span>
              <span className="rate-stars" aria-hidden="true"><StarSolid /><StarSolid /><StarSolid /><StarSolid /><StarSolid /></span>
            </a>
            <a className="choice choice-two" href={managerHref}>
              <Chat />
              <span><b>{copy.manager}</b><small>{copy.managerHint}</small></span>
            </a>
          </nav>
          {clubHref && <a className="guest-club" href={clubHref}><Gift /> {copy.club}</a>}
        </section>

        {nav.length > 1 && (
          <nav className="gx-nav" aria-label={business.name}>
            {nav.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
          </nav>
        )}

        {showPromos && (
          <section className="gx-section" id="promos">
            <h2 className="gx-h"><Tag /> {copy.xPromos}</h2>
            <div className="gx-scroll">
              {promos.map((p) => (
                <article key={p.id} className="gx-promo">
                  {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <div className="gx-promo-band" aria-hidden="true"><Tag /></div>}
                  <div className="gx-promo-body">
                    <b>{p.title}</b>
                    {p.body && <p>{p.body}</p>}
                    {(p.ends_on || p.starts_on) && (
                      <small>{p.ends_on ? fill(copy.xUntil, "d", day(p.ends_on, lang)) : fill(copy.xFrom, "d", day(p.starts_on!, lang))}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {showCatalog && (
          <section className="gx-section" id="catalogo">
            <h2 className="gx-h gx-h-row">{e.catalog_title || copy.xCatalog}{orderHref && <a className="btn btn-dark btn-sm gx-h-btn" href={preview ? "#" : orderHref}>{copy.oOrder}</a>}</h2>
            {groups.map((g) => (
              <div key={g.name || "all"} className="gx-group">
                {g.name && <h3 className="gx-group-name">{g.name}</h3>}
                <ul className="gx-items">
                  {g.list.map((x) => (
                    <li key={x.id} className="gx-item">
                      <div className="gx-item-text">
                        <b>{x.name}</b>
                        {x.description && <p>{x.description}</p>}
                        {x.price != null && <span className="gx-price num">{usd(x.price)}</span>}
                      </div>
                      {x.image_url && <img src={x.image_url} alt="" loading="lazy" />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {showGallery && (
          <section className="gx-section" id="fotos">
            <h2 className="gx-h">{copy.xGallery}</h2>
            <div className="gx-scroll gx-photos">
              {e.gallery.map((g) => <img key={g} src={g} alt="" loading="lazy" />)}
            </div>
          </section>
        )}

        {showInfo && (
          <section className="gx-section" id="info">
            <h2 className="gx-h">{copy.xInfo}</h2>
            {e.about && <p className="gx-about">{e.about}</p>}
            {e.hours.length === 7 && (
              <div className="gx-card">
                <h3 className="gx-card-title"><Clock /> {copy.xHours}</h3>
                <ul className="gx-hours">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const h = e.hours[d];
                    const today = new Date(Date.now() - 5 * 3600_000).getUTCDay() === d;
                    return (
                      <li key={d} className={today ? "today" : undefined}>
                        <span>{copy.xDays[d]}{today ? ` · ${copy.xToday}` : ""}</span>
                        <span className="num">{h ? `${clock(h.open, lang)} – ${clock(h.close, lang)}` : copy.xDayClosed}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {e.policies && (
              <div className="gx-card">
                <h3 className="gx-card-title">{copy.xPolicies}</h3>
                <p className="gx-about">{e.policies}</p>
              </div>
            )}
          </section>
        )}

        {showLocation && (
          <section className="gx-section" id="ubicacion">
            <h2 className="gx-h">{copy.xLocation}</h2>
            <div className="gx-card gx-location">
              <Route />
              <span>{e.address || business.name}</span>
            </div>
            {maps && <Ext className="btn btn-dark btn-block gx-btn" href={maps}>{copy.xDirections}</Ext>}
          </section>
        )}

        {showContact && (
          <section className="gx-section" id="contacto">
            <h2 className="gx-h">{copy.xContact}</h2>
            <ul className="gx-links">
              {wa && <li><Ext className="gx-link" href={`https://wa.me/${wa}`}><Chat /><span>{copy.xWhatsApp}</span><small>{e.whatsapp}</small></Ext></li>}
              {tel && <li><a className="gx-link" href={preview ? "#" : `tel:${tel}`}><Phone /><span>{copy.xCall}</span><small>{e.phone}</small></a></li>}
              {socials.map((x) => <li key={x.k}><Ext className="gx-link" href={x.url!}>{x.icon}<span>{x.label}</span></Ext></li>)}
            </ul>
          </section>
        )}

        <footer className="guest-foot">
          <span className="powered"><LogoMark size={12} /> FiveTap</span>
        </footer>
      </div>
    </main>
  );
}
