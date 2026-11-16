"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The business's two colors. They can be typed, or read from its logo: the logo is drawn
 * on a small canvas and its most present colors are grouped; the most vivid frequent one is
 * the main color and the next clearly different hue is the secondary. Everything stays
 * editable afterwards. Works with a logo chosen in the form or the one already saved.
 */

type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
function hsl([r, g, b]: RGB) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

export function pickColors(img: HTMLImageElement): { primary: string; accent: string } | null {
  const size = 72;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, { n: number; sum: RGB }>();
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3]! < 200) continue; // transparent
    const px: RGB = [data[p]!, data[p + 1]!, data[p + 2]!];
    const key = px.map((v) => v >> 4).join(",");
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++; b.sum = [b.sum[0] + px[0], b.sum[1] + px[1], b.sum[2] + px[2]];
    buckets.set(key, b);
  }
  const colors = [...buckets.values()].map((b) => { const avg: RGB = [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n]; return { rgb: avg, n: b.n, ...hsl(avg) }; });
  if (!colors.length) return null;
  // Backgrounds (near white) never count; vivid colors weigh more than greys.
  const solid = colors.filter((x) => x.l < 0.94);
  const vivid = solid.filter((x) => x.s >= 0.25 && x.l > 0.1 && x.l < 0.88).sort((a, z) => z.n * (0.4 + z.s) - a.n * (0.4 + a.s));
  if (!vivid.length) {
    // A black-and-white logo: its darkest frequent tone, and a soft grey as secondary.
    const dark = solid.sort((a, z) => z.n - a.n)[0];
    return dark ? { primary: hex(dark.rgb), accent: "#6b6b6b" } : null;
  }
  const main = vivid[0]!;
  const second = vivid.find((x) => hueGap(x.h, main.h) > 28 && x.n >= main.n * 0.08)
    ?? solid.filter((x) => x.l < 0.3 && x.n >= main.n * 0.15).sort((a, z) => z.n - a.n)[0]
    ?? null;
  const accent = second ? hex(second.rgb) : hex(main.rgb.map((v) => v * 0.72) as RGB);
  return { primary: hex(main.rgb), accent };
}

export function BrandColors({ primary, accent, logoUrl }: { primary?: string | null; accent?: string | null; logoUrl?: string | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(primary || "#0a0a0a");
  const [a, setA] = useState(accent || primary || "#0a0a0a");
  const [note, setNote] = useState<string | null>(null);

  const read = (src: string, revoke?: boolean) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const r = pickColors(img);
        if (r) { setP(r.primary); setA(r.accent); setNote("Colores tomados del logo. Puedes ajustarlos."); }
        else setNote("No se pudieron leer colores de este logo. Elígelos a mano.");
      } catch {
        setNote("No se pudieron leer colores de este logo. Elígelos a mano.");
      }
      if (revoke) URL.revokeObjectURL(src);
    };
    img.onerror = () => setNote("No se pudo abrir el logo. Elige los colores a mano.");
    img.src = src;
  };

  // A logo picked in the same form is read right away.
  useEffect(() => {
    const input = wrap.current?.closest("form")?.querySelector<HTMLInputElement>('input[name="logo"]');
    if (!input) return;
    const on = () => { const f = input.files?.[0]; if (f) read(URL.createObjectURL(f), true); };
    input.addEventListener("change", on);
    return () => input.removeEventListener("change", on);
  }, []);

  return (
    <div className="field brand-colors" ref={wrap}>
      <span>Colores del negocio</span>
      <div className="brand-colors-row">
        <label><input type="color" name="brand_color" value={p} onChange={(e) => setP(e.target.value)} aria-label="Color principal" /><small>Principal</small></label>
        <label><input type="color" name="brand_accent" value={a} onChange={(e) => setA(e.target.value)} aria-label="Color secundario" /><small>Secundario</small></label>
        <span className="brand-preview" style={{ background: p, color: a }} aria-hidden="true"><i style={{ background: a }} /></span>
        {logoUrl && <button type="button" className="btn btn-ghost btn-sm" onClick={() => read(logoUrl)}>Tomar del logo</button>}
      </div>
      <small>{note ?? "Al subir el logo, FiveTap lee sus colores y los propone. El principal va en la portada y el botón de reseña; el secundario, en los iconos."}</small>
    </div>
  );
}
