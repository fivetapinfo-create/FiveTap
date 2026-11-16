/** Black or white text, whichever reads better on the given hex background. */
export function onColor(hex: string): "#ffffff" | "#0b0b0f" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0b0b0f" : "#ffffff";
}

export function safeColor(hex: string | null | undefined, fallback = "#111111"): string {
  return hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

// ---------- Palette for a business's NFC page ----------

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;
function lum(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
/** WCAG contrast ratio between two hex colors (1 to 21). */
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
/** Mixes a color toward another (t = 0 keeps a, 1 gives b). */
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
/** The same hue, darkened only as much as needed to read on `bg` (icons and links on light cards). */
export function readable(hex: string, bg = "#ffffff", min = 3) {
  let c = hex;
  for (let k = 0; k < 12 && contrast(c, bg) < min; k++) c = mix(c, "#000000", 0.12);
  return c;
}

/**
 * Everything the NFC page needs from a business's two colors: the main color (buttons,
 * header), the secondary (icons, accents) made readable on white cards, a soft page tint
 * and the text color that reads on the main one. Black-and-white brands keep FiveTap ink.
 */
export function palette(primary: string | null | undefined, accent: string | null | undefined) {
  const p = safeColor(primary, "#0a0a0a");
  const custom = !["#0a0a0a", "#111111", "#000000"].includes(p.toLowerCase());
  const a = safeColor(accent, p);
  return {
    custom,
    brand: p,
    onBrand: onColor(p),
    accent: readable(a),
    accentSoft: mix(a, "#ffffff", 0.86),
    tint: custom ? mix(p, "#ffffff", 0.94) : null,
  };
}
