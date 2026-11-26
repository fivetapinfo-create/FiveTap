// What a business's NFC experience is made of, and the small rules every page shares
// (open now, which sections show). No server imports: the editor preview uses it too.

export type DayHours = { open: string; close: string } | null;
export type Sections = { promos: boolean; catalog: boolean; gallery: boolean; info: boolean; location: boolean; contact: boolean; social: boolean };

export type Experience = {
  cover_url: string | null;
  tagline: string | null;
  about: string | null;
  policies: string | null;
  /** "Menú", "Servicios"…: the name of the catalog section. */
  catalog_title: string | null;
  /** Sunday = 0 … Saturday = 6; null = closed that day. Empty array = no hours given. */
  hours: DayHours[];
  address: string | null;
  maps_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
  /** Guest Wi-Fi shown on the NFC page (name and password), when the business wants it. */
  wifi_ssid: string | null;
  wifi_password: string | null;
  gallery: string[];
  sections: Sections;
};

export type Promotion = { id: string; business_id: string; title: string; body: string | null; image_url: string | null; starts_on: string | null; ends_on: string | null; active: boolean; sort: number };
export type CatalogItem = { id: string; business_id: string; category: string | null; name: string; description: string | null; price: number | null; image_url: string | null; active: boolean; sort: number };

export const ALL_SECTIONS: Sections = { promos: true, catalog: true, gallery: true, info: true, location: true, contact: true, social: true };

export const EMPTY_EXPERIENCE: Experience = {
  cover_url: null, tagline: null, about: null, policies: null, catalog_title: null, hours: [],
  address: null, maps_url: null, phone: null, whatsapp: null, instagram: null, facebook: null, tiktok: null, website: null, wifi_ssid: null, wifi_password: null,
  gallery: [], sections: ALL_SECTIONS,
};

/** Any stored value (or null) as a complete Experience. */
export function asExperience(v: unknown): Experience {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Experience>;
  return {
    ...EMPTY_EXPERIENCE,
    ...o,
    hours: Array.isArray(o.hours) && o.hours.length === 7 ? o.hours : [],
    gallery: Array.isArray(o.gallery) ? o.gallery.filter((x) => typeof x === "string").slice(0, 12) : [],
    sections: { ...ALL_SECTIONS, ...(o.sections ?? {}) },
  };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Day of the week and minutes since midnight, in Panamá. */
export function panamaNow(d = new Date()) {
  const p = new Date(d.getTime() - 5 * 3600_000);
  return { day: p.getUTCDay(), min: p.getUTCHours() * 60 + p.getUTCMinutes() };
}

/** "Abierto · cierra a las 22:00" or "Cerrado · abre a las 09:00": null when no hours were given. */
export function openState(hours: DayHours[], now = panamaNow()): { open: boolean; until: string | null; next: string | null } | null {
  if (hours.length !== 7) return null;
  const today = hours[now.day];
  const yesterday = hours[(now.day + 6) % 7];
  // Late nights: yesterday's hours that run past midnight.
  if (yesterday && toMin(yesterday.close) <= toMin(yesterday.open) && now.min < toMin(yesterday.close)) return { open: true, until: yesterday.close, next: null };
  if (today) {
    const o = toMin(today.open), c = toMin(today.close);
    const overnight = c <= o;
    if (now.min >= o && (overnight || now.min < c)) return { open: true, until: today.close, next: null };
    if (now.min < o) return { open: false, until: null, next: today.open };
  }
  for (let i = 1; i <= 7; i++) {
    const h = hours[(now.day + i) % 7];
    if (h) return { open: false, until: null, next: h.open };
  }
  return { open: false, until: null, next: null };
}

/** A promotion is shown while active and inside its dates (Panamá day). */
export function promoLive(p: Pick<Promotion, "active" | "starts_on" | "ends_on">, today: string) {
  return p.active && (!p.starts_on || p.starts_on <= today) && (!p.ends_on || p.ends_on >= today);
}

/** wa.me needs digits with the country code; Panamá numbers are 8 (mobile) or 7 digits. */
export function waDigits(v: string | null) {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length < 7 || d.length > 15) return null;
  return d.length <= 8 ? `507${d}` : d;
}

/** "@lugar" or a full link, as a link. */
export function socialUrl(kind: "instagram" | "facebook" | "tiktok", v: string | null) {
  if (!v) return null;
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, "").replace(/^.*\.com\//, "");
  if (!handle) return null;
  return kind === "instagram" ? `https://instagram.com/${handle}` : kind === "facebook" ? `https://facebook.com/${handle}` : `https://www.tiktok.com/@${handle}`;
}

/** True when a published experience has something beyond the review card. */
export function hasContent(e: Experience, promos: number, items: number) {
  // Social networks and the website count too: a venue with only its Instagram still gets the
  // full page (cover, buttons, "Síguenos"), never the plain fallback card.
  return Boolean(e.cover_url || e.tagline || e.about || e.hours.length || e.address || e.whatsapp || e.phone || e.wifi_ssid || e.gallery.length || e.instagram || e.tiktok || e.facebook || e.website || promos || items);
}

const SOCIAL_HOSTS = { instagram: ["instagram.com"], facebook: ["facebook.com", "fb.com", "m.facebook.com"], tiktok: ["tiktok.com"] } as const;
const HANDLE = { instagram: /^[A-Za-z0-9._]{1,30}$/, facebook: /^[A-Za-z0-9.\-]{3,80}$/, tiktok: /^[A-Za-z0-9._]{2,24}$/ } as const;

/**
 * Checks a social profile typed by the founder: a handle (@lugar) or a link on that
 * network's own domain. Returns the clean value to store, or an error saying what to fix.
 * It cannot confirm the profile exists (the networks block that): the editor shows a
 * link to open it and check.
 */
export function checkSocial(kind: "instagram" | "facebook" | "tiktok", v: string | null): { value: string | null; error?: string } {
  const s = (v ?? "").trim();
  if (!s) return { value: null };
  const name = kind === "instagram" ? "Instagram" : kind === "facebook" ? "Facebook" : "TikTok";
  if (/^https?:\/\//i.test(s) || /\.(com|net)\//i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (!(SOCIAL_HOSTS[kind] as readonly string[]).includes(host)) return { value: null, error: `El enlace de ${name} debe ser de ${SOCIAL_HOSTS[kind][0]}.` };
      const first = u.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "");
      if (!first) return { value: null, error: `El enlace de ${name} no tiene un perfil.` };
      return { value: kind === "facebook" && first === "profile.php" ? u.toString() : first };
    } catch {
      return { value: null, error: `Revisa el enlace de ${name}.` };
    }
  }
  const handle = s.replace(/^@/, "");
  if (!HANDLE[kind].test(handle)) return { value: null, error: `El usuario de ${name} no es válido: escribe @usuario o pega el enlace del perfil.` };
  return { value: handle };
}
