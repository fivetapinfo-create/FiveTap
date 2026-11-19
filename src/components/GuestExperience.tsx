import { palette } from "@/lib/brand";
import { openState, socialUrl, waDigits, type CatalogItem, type Experience, type Promotion } from "@/lib/experience-shape";
import type { Copy, Lang } from "@/lib/i18n";
import { BusinessLogo } from "./BusinessLogo";
import { CopyText } from "./CopyText";
import { Bag, Calendar, Camera, Card, Users, Facebook, TikTok, Chat, Clock, Gift, Globe, Phone, Route, StarSolid, Tag } from "./Icons";
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
  cardHref?: string;
  serviceHref?: string;
  /** Ordering from the plaque, when the business has the Orders module. */
  orderHref?: string;
  /** Booking from the plaque, when the business has the Reservations module. */
  reserveHref?: string;
  /** Founder preview: links inside the page do nothing, nothing is counted. */
  preview?: boolean;
};

const Chevron = () => (
  <svg className="gx-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
const Wifi = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 15.9a5 5 0 0 1 6.8 0" /><path d="M12 19.5h.01" strokeWidth="2.6" /></svg>
);
const Menu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>
);
/** Google's "G", in its own colors (the review button points to Google). */
const GoogleG = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" /><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" /><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" /></svg>
);

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
export function GuestExperience({ business, experience: e, promos, items, copy, lang, reviewHref, managerHref, clubHref, cardHref, serviceHref, orderHref, reserveHref, preview }: Props) {
  // Each business wears its own colors: main (cover, review button), secondary (icons), a soft page tint.
  const pal = palette(business.brand_color, business.brand_accent);
  const brand = pal.brand;
  const style = {
    "--brand": pal.custom ? pal.brand : undefined,
    "--on-brand": pal.custom ? pal.onBrand : undefined,
    "--gx-accent": pal.accent,
    "--gx-accent-soft": pal.accentSoft,
    "--gx-tint": pal.tint ?? undefined,
  } as React.CSSProperties;
  const link = (href: string | null) => (preview ? "#" : href ?? "#");
  const state = openState(e.hours);
  const wa = waDigits(e.whatsapp);
  const tel = e.phone ? e.phone.replace(/[^\d+]/g, "") : null;
  const maps = e.maps_url ?? (e.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.address} ${business.name}`)}` : null);
  const socials = [
    { k: "instagram" as const, label: "Instagram", url: socialUrl("instagram", e.instagram), icon: <Camera /> },
    { k: "tiktok" as const, label: "TikTok", url: socialUrl("tiktok", e.tiktok), icon: <TikTok /> },
    { k: "facebook" as const, label: "Facebook", url: socialUrl("facebook", e.facebook), icon: <Facebook /> },
    { k: "web" as const, label: copy.xWebsite, url: e.website, icon: <Globe /> },
  ].filter((s) => s.url);
  const s = e.sections;
  const showPromos = s.promos && promos.length > 0;
  const showCatalog = s.catalog && items.length > 0;
  const showGallery = s.gallery && e.gallery.length > 0;
  const showInfo = s.info && Boolean(e.about || e.hours.length || e.policies);
  const showLocation = s.location && Boolean(e.address || e.maps_url);
  const networks = socials.filter((x) => x.k !== "web");
  const site = socials.find((x) => x.k === "web");
  const handle = (k: string) => (k === "instagram" ? e.instagram : k === "tiktok" ? e.tiktok : k === "facebook" ? e.facebook : null);
  const showSocial = s.social !== false && Boolean(networks.length || wa);
  const showContact = s.contact && Boolean(wa || tel || site);
  const groups = [...new Set(items.map((x) => x.category || ""))].map((c) => ({ name: c || (items.some((x) => x.category) ? copy.xOther : ""), list: items.filter((x) => (x.category || "") === c) }));
  const nav = [
    showPromos && { id: "promos", label: copy.xPromos },
    showCatalog && { id: "catalogo", label: e.catalog_title || copy.xCatalog },
    showGallery && { id: "fotos", label: copy.xGallery },
    showInfo && { id: "info", label: copy.xInfo },
    showLocation && { id: "ubicacion", label: copy.xLocation },
    showSocial && { id: "redes", label: copy.xSocial },
    showContact && { id: "contacto", label: copy.xContact },
  ].filter(Boolean) as { id: string; label: string }[];
  const Ext = ({ href, className, children }: { href: string | null; className: string; children: React.ReactNode }) => (
    <a className={className} href={link(href)} {...(preview ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{children}</a>
  );

  return (
    <main className={`guest gx${business.page_bg_url ? " has-bg" : ""}`} style={{ ...style, ...(business.page_bg_url ? { "--page-bg": `url("${business.page_bg_url.replace(/"/g, "")}")` } : {}) } as React.CSSProperties}>
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
        <section className="gx-review" aria-labelledby="gx-q">
          <h2 id="gx-q" className="gx-q rise" style={i(4)}>{copy.question}</h2>
          <nav className="gx-tiles" aria-label={copy.question}>
            {/* Plain <a>: the click is counted server-side and must never be prefetched. Shown to everyone, always. */}
            <a className="gx-tile gx-tile-main rise" style={i(5)} href={reviewHref}>
              <span className="gx-tile-ic gx-g"><GoogleG /></span>
              <span className="gx-tile-txt"><b>{copy.review}</b><span className="rate-stars" aria-hidden="true"><StarSolid /><StarSolid /><StarSolid /><StarSolid /><StarSolid /></span></span>
              <Chevron />
            </a>
            {serviceHref && (
              <a className="gx-tile gx-tile-service rise" style={i(6)} href={preview ? "#" : serviceHref}>
                <span className="gx-tile-ic"><Users /></span>
                <span className="gx-tile-txt"><b>{copy.wTile}</b><small>{copy.wTileHint}</small></span>
                <Chevron />
              </a>
            )}
            <a className="gx-tile rise" style={i(6)} href={managerHref}>
              <span className="gx-tile-ic"><Chat /></span>
              <span className="gx-tile-txt"><b>{copy.manager}</b><small>{copy.managerHint}</small></span>
              <Chevron />
            </a>
            {cardHref && (
              <a className="gx-tile rise" style={i(6)} href={preview ? "#" : cardHref}>
                <span className="gx-tile-ic"><Card /></span>
                <span className="gx-tile-txt"><b>{copy.card}</b><small>{copy.cardHint}</small></span>
                <Chevron />
              </a>
            )}
            {clubHref && (
              <a className="gx-tile rise" style={i(6)} href={clubHref}>
                <span className="gx-tile-ic"><Gift /></span>
                <span className="gx-tile-txt"><b>{copy.club}</b></span>
                <Chevron />
              </a>
            )}
            {orderHref && (
              <a className="gx-tile rise" style={i(6)} href={preview ? "#" : orderHref}>
                <span className="gx-tile-ic"><Bag /></span>
                <span className="gx-tile-txt"><b>{copy.oOrder}</b></span>
                <Chevron />
              </a>
            )}
            {reserveHref && (
              <a className="gx-tile rise" style={i(7)} href={preview ? "#" : reserveHref}>
                <span className="gx-tile-ic"><Calendar /></span>
                <span className="gx-tile-txt"><b>{copy.rReserve}</b></span>
                <Chevron />
              </a>
            )}
            {showCatalog && (
              <a className="gx-tile rise" style={i(7)} href="#catalogo">
                <span className="gx-tile-ic"><Menu /></span>
                <span className="gx-tile-txt"><b>{`${copy.xView} ${(e.catalog_title || copy.xCatalog).toLowerCase()}`}</b></span>
                <Chevron />
              </a>
            )}
            {showPromos && (
              <a className="gx-tile rise" style={i(8)} href="#promos">
                <span className="gx-tile-ic"><Tag /></span>
                <span className="gx-tile-txt"><b>{copy.xPromos}</b><small>{promos.length === 1 ? copy.xPromosHint1 : fill(copy.xPromosHint, "n", String(promos.length))}</small></span>
                <Chevron />
              </a>
            )}
            {/* One bar for the social networks, like "Califícanos", each icon opens its network. */}
            {networks.length > 0 && (
              <div className="gx-tile gx-tile-social rise" style={i(8)}>
                <span className="gx-tile-txt"><b>{copy.xSocialBar}</b><small>{copy.xSocialBarHint}</small></span>
                <span className="gx-social">
                  {networks.map((n) => <Ext key={n.k} className={`gx-social-ic gx-social-${n.k}`} href={n.url}>{n.icon}<span className="sr-only">{n.label}</span></Ext>)}
                </span>
              </div>
            )}
            {e.wifi_ssid && (
              <details className="gx-tile gx-tile-wifi rise" style={i(8)}>
                <summary>
                  <span className="gx-tile-ic"><Wifi /></span>
                  <span className="gx-tile-txt"><b>{copy.xWifi}</b><small>{e.wifi_ssid}</small></span>
                  <Chevron />
                </summary>
                <div className="gx-wifi">
                  <div><small>{copy.xWifiNet}</small><b>{e.wifi_ssid}</b></div>
                  {e.wifi_password ? (
                    <div className="gx-wifi-pass"><span><small>{copy.xWifiPass}</small><b className="num">{e.wifi_password}</b></span><CopyText value={e.wifi_password} label={copy.xCopy} done={copy.xCopied} /></div>
                  ) : <small>{copy.xWifiOpen}</small>}
                </div>
              </details>
            )}
            {maps && s.location && (
              <Ext className="gx-tile rise" href={maps}>
                <span className="gx-tile-ic"><Route /></span>
                <span className="gx-tile-txt"><b>{copy.xDirections}</b>{e.address && <small>{e.address}</small>}</span>
                <Chevron />
              </Ext>
            )}
            {wa && (
              <Ext className="gx-tile rise" href={`https://wa.me/${wa}`}>
                <span className="gx-tile-ic"><Phone /></span>
                <span className="gx-tile-txt"><b>{copy.xWhatsApp}</b><small>{e.whatsapp}</small></span>
                <Chevron />
              </Ext>
            )}
          </nav>
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

        {showSocial && (
          <section className="gx-section" id="redes">
            <h2 className="gx-h">{copy.xSocial}</h2>
            <p className="gx-social-lead">{copy.xSocialLead.replace("{name}", business.name)}</p>
            <div className="gx-social">
              {networks.map((x) => (
                <Ext key={x.k} className={`gx-net gx-net-${x.k}`} href={x.url!}>
                  {x.icon}
                  <span className="gx-net-text"><b>{x.label}</b><small>{handle(x.k) && !/^https?:/.test(handle(x.k)!) ? `@${handle(x.k)}` : business.name}</small></span>
                  <span className="gx-net-cta">{copy.xFollow}</span>
                </Ext>
              ))}
              {wa && (
                <Ext className="gx-net gx-net-whatsapp" href={`https://wa.me/${wa}`}>
                  <Chat />
                  <span className="gx-net-text"><b>{copy.xWhatsApp}</b><small>{e.whatsapp}</small></span>
                  <span className="gx-net-cta">{copy.xWrite}</span>
                </Ext>
              )}
            </div>
          </section>
        )}

        {showContact && (
          <section className="gx-section" id="contacto">
            <h2 className="gx-h">{copy.xContact}</h2>
            <ul className="gx-links">
              {wa && <li><Ext className="gx-link" href={`https://wa.me/${wa}`}><Chat /><span>{copy.xWhatsApp}</span><small>{e.whatsapp}</small></Ext></li>}
              {tel && <li><a className="gx-link" href={preview ? "#" : `tel:${tel}`}><Phone /><span>{copy.xCall}</span><small>{e.phone}</small></a></li>}
              {site && <li><Ext className="gx-link" href={site.url!}>{site.icon}<span>{site.label}</span></Ext></li>}
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
