// Motor de estilo del canal: escena JSON -> SVG -> PNG (Playwright, ya instalado).
// Uso: node canal/estilo/render.mjs canal/escenas/miniatura-dormir.json [salida.png]
// Todo en código: gratis, sin límites, personajes idénticos en cada video.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------- Paleta fija del canal (no cambiar sin decidirlo) ----------
export const P = {
  tinta: '#151515',
  cabeza: '#ffffff',
  amarillo: '#f7ef3c', // texto miniatura
  acento: '#ff7a1a', // firma del canal: el pañuelo naranja del protagonista
  cielo: '#d6e9f2',
  arena: '#d8c58b',
  cueva: '#6d5f4c',
  cuevaOsc: '#4a3f33',
  noche: '#2c3f7a',
  pasto: '#9aa86a',
  sol: '#f2c46a',
};

// ---------- trazo "a mano" determinista ----------
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
let R = rng(7);
const j = (a) => (R() - 0.5) * 2 * a;

function linea(x1, y1, x2, y2, w = 6, color = P.tinta, wob = 1.6) {
  const mx = (x1 + x2) / 2 + j(wob), my = (y1 + y2) / 2 + j(wob);
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function poli(pts, w = 6, color = P.tinta) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += ` L${(pts[i][0] + j(0.8)).toFixed(1)} ${(pts[i][1] + j(0.8)).toFixed(1)}`;
  return `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function circulo(cx, cy, r, fill = P.cabeza, w = 6, color = P.tinta, wob = 0.012) {
  const n = 28; let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + (i === n ? 0 : j(wob)));
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;
}

// ---------- Caras ----------
// mira: [dx,dy] -1..1 dónde miran las pupilas
const EXPR = {
  neutral: { cejas: [0, 0], boca: 'recta', parpado: 0 },
  confundido: { cejas: [-12, 6], boca: 'torcida', parpado: 0 },
  sospecha: { cejas: [8, 8], boca: 'recta', parpado: 0.45 },
  presumido: { cejas: [6, -4], boca: 'sonrisa', parpado: 0.5 },
  feliz: { cejas: [-4, -4], boca: 'sonrisa', parpado: 0 },
  asustado: { cejas: [-14, -14], boca: 'o', parpado: 0 },
  enojado: { cejas: [16, 16], boca: 'triste', parpado: 0.2 },
  triste: { cejas: [-14, -14], boca: 'triste', parpado: 0.15 },
  pensando: { cejas: [-10, 4], boca: 'recta-lado', parpado: 0 },
};

function cara(r, expr = 'neutral', mira = [0.6, -0.5], lado = 1, extra = {}) {
  const e = { ...EXPR[expr] || EXPR.neutral, ...extra };
  const s = r / 60, w = 5 * s;
  const ox = 10 * s * lado; // los ojos se corren hacia donde mira la cabeza
  const er = 15 * s, sep = 17 * s, ey = -6 * s;
  let o = '';
  for (const k of [-1, 1]) {
    const ex = ox + k * sep;
    o += circulo(ex, ey, er, '#fff', w * 0.9);
    const px = ex + mira[0] * er * 0.5, py = ey + mira[1] * er * 0.5;
    o += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(5.4 * s).toFixed(1)}" fill="${P.tinta}"/>`;
    if (e.parpado > 0) {
      const top = ey - er, h = er * 2 * e.parpado;
      o += `<path d="M${ex - er} ${ey - er * 0.15 - er + h} A${er} ${er} 0 0 1 ${ex + er} ${ey - er * 0.15 - er + h}" fill="#fff" stroke="none"/>`;
      o += `<clipPath id="c${Math.round(ex * 10)}"><circle cx="${ex}" cy="${ey}" r="${er - w * 0.45}"/></clipPath>`;
      o += `<rect x="${ex - er}" y="${top}" width="${er * 2}" height="${h}" fill="#fff" clip-path="url(#c${Math.round(ex * 10)})"/>`;
      o += linea(ex - er * 0.95, top + h, ex + er * 0.95, top + h, w * 0.9);
    }
    // ceja: [inclinación interior, inclinación exterior] en px (positivo = baja)
    const cy0 = ey - er - 9 * s;
    const inner = k === -1 ? ex + er * 0.7 : ex - er * 0.7;
    const outer = k === -1 ? ex - er * 0.8 : ex + er * 0.8;
    o += linea(outer, cy0 + e.cejas[1] * s * 0.5, inner, cy0 + e.cejas[0] * s * 0.5, w * 0.9);
  }
  const mx = ox + 2 * s, my = (e.bigote ? 36 : 30) * s;
  switch (e.boca) {
    case 'sonrisa': o += `<path d="M${mx - 14 * s} ${my - 3 * s} Q${mx} ${my + 9 * s} ${mx + 14 * s} ${my - 4 * s}" stroke="${P.tinta}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; break;
    case 'triste': o += `<path d="M${mx - 12 * s} ${my + 5 * s} Q${mx} ${my - 5 * s} ${mx + 12 * s} ${my + 5 * s}" stroke="${P.tinta}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; break;
    case 'torcida': o += linea(mx - 13 * s, my + 4 * s, mx + 11 * s, my - 2 * s, w); break;
    case 'o': o += `<ellipse cx="${mx}" cy="${my + 2 * s}" rx="${6 * s}" ry="${8 * s}" fill="${P.tinta}"/>`; break;
    case 'recta-lado': o += linea(mx - 2 * s, my, mx + 14 * s, my - 1 * s, w); break;
    default: o += linea(mx - 11 * s, my, mx + 11 * s, my, w);
  }
  if (e.bigote) o += `<path d="M${mx - 16 * s} ${my - 12 * s} q${8 * s} ${-7 * s} ${16 * s} 0 q${8 * s} ${-7 * s} ${16 * s} 0" stroke="${P.tinta}" stroke-width="${w * 0.9}" fill="none" stroke-linecap="round"/>`;
  return o;
}

// ---------- Accesorios ----------
function accesorio(tipo, r) {
  const s = r / 60, w = 5 * s;
  switch (tipo) {
    case 'casco': return `<path d="M${-58 * s} ${-28 * s} Q${-56 * s} ${-82 * s} 0 ${-84 * s} Q${56 * s} ${-82 * s} ${58 * s} ${-28 * s} Z" fill="#f4d000" stroke="${P.tinta}" stroke-width="${w}" stroke-linejoin="round"/>` + `<rect x="${-72 * s}" y="${-34 * s}" width="${144 * s}" height="${12 * s}" rx="${5 * s}" fill="#f4d000" stroke="${P.tinta}" stroke-width="${w}"/>` + linea(0, -84 * s, 0, -36 * s, w * 0.8);
    case 'chistera': return `<rect x="${-42 * s}" y="${-150 * s}" width="${84 * s}" height="${100 * s}" fill="${P.tinta}"/>` + `<rect x="${-70 * s}" y="${-58 * s}" width="${140 * s}" height="${10 * s}" rx="${4 * s}" fill="${P.tinta}"/>`;
    case 'marinero': return `<path d="M${-44 * s} ${-44 * s} L${-30 * s} ${-82 * s} L${44 * s} ${-74 * s} L${46 * s} ${-44 * s} Z" fill="${P.tinta}"/>`;
    case 'rizos': { let o = ''; for (let i = 0; i < 14; i++) { const a = Math.PI * (1.05 + i / 13 * 0.95); o += `<circle cx="${(Math.cos(a) * 58 * s).toFixed(1)}" cy="${(Math.sin(a) * 58 * s - 4 * s).toFixed(1)}" r="${13 * s}" fill="${P.tinta}"/>`; } return o; }
    case 'cavernario': return `<path d="M${-60 * s} ${-14 * s} Q${-70 * s} ${-70 * s} ${-20 * s} ${-66 * s} Q0 ${-90 * s} ${30 * s} ${-64 * s} Q${70 * s} ${-60 * s} ${58 * s} ${-14 * s} Q${40 * s} ${-44 * s} 0 ${-46 * s} Q${-40 * s} ${-46 * s} ${-60 * s} ${-14 * s}Z" fill="#5a3b22"/>`;
    default: return '';
  }
}

// ---------- Personaje ----------
// Poses: ángulos en grados (0 = abajo). brazos [izq, der], codos, piernas, rodillas.
const POSES = {
  parado: { torso: 0, bI: [24, 10], bD: [-24, -10], pI: [14, -4], pD: [-14, 4] },
  saluda: { torso: 0, bI: [24, 10], bD: [-150, 30], pI: [14, -4], pD: [-14, 4] },
  senala: { torso: 0, bI: [24, 10], bD: [-95, 0], pI: [14, -4], pD: [-14, 4] },
  hombros: { torso: 0, bI: [60, -110], bD: [-60, 110], pI: [14, -4], pD: [-14, 4] },
  camina: { torso: 4, bI: [-25, -15], bD: [30, 20], pI: [-28, 20], pD: [25, 5] },
  corre: { torso: 14, bI: [-70, -60], bD: [60, 70], pI: [-60, 60], pD: [45, 10] },
  sentado: { torso: 0, bI: [20, 40], bD: [-20, -40], pI: [80, -80], pD: [70, -75] },
  acostado: { torso: 0, bI: [150, 120], bD: [-20, -30], pI: [4, 0], pD: [-40, 75] }, // usar con rot≈-72 y cabezaRot≈60
  manosCintura: { torso: 0, bI: [55, -110], bD: [-55, 110], pI: [16, -4], pD: [-16, 4] },
};

function hueso(x, y, ang, len) {
  const a = (ang * Math.PI) / 180;
  return [x + Math.sin(a) * len, y + Math.cos(a) * len];
}

function personaje(c) {
  R = rng(c.seed ?? Math.round((c.x + 3) * (c.y + 7)));
  const r = c.cabeza ?? 70, s = r / 60, w = 6;
  const pose = { ...POSES[c.pose || 'parado'], ...(c.ajustes || {}) };
  const L = { cuello: 8, torso: 150, brazo: 70, ante: 66, muslo: 80, pierna: 76 };
  const t = pose.torso;
  // cadera como origen; torso sube
  const hip = [0, 0];
  const sh = hueso(0, 0, 180 + t, L.torso * 0.82);
  const neck = hueso(0, 0, 180 + t, L.torso);
  const head = hueso(0, 0, 180 + t, L.torso + r + L.cuello - 6);
  let body = '';
  body += linea(hip[0], hip[1], neck[0], neck[1], w);
  const lado = c.mira === 'izq' ? -1 : 1;
  const limb = (o, [a1, a2], l1, l2) => {
    const m = hueso(o[0], o[1], a1 + t * (l1 === L.brazo ? 1 : 0), l1);
    const e = hueso(m[0], m[1], a1 + a2 + t * (l1 === L.brazo ? 1 : 0), l2);
    return [poli([o, m, e], w), e];
  };
  const [pi] = limb(hip, pose.pI, L.muslo, L.pierna);
  const [pd] = limb(hip, pose.pD, L.muslo, L.pierna);
  const [bi, mI] = limb(sh, pose.bI, L.brazo, L.ante);
  const [bd, mD] = limb(sh, pose.bD, L.brazo, L.ante);
  body += pi + pd + bi + bd;
  // pañuelo firma (protagonista)
  if (c.panuelo) {
    const [nx, ny] = neck;
    body += `<path d="M${nx - 26} ${ny - 6} Q${nx} ${ny + 14} ${nx + 26} ${ny - 6} L${nx + 22} ${ny + 14} Q${nx} ${ny + 32} ${nx - 22} ${ny + 14}Z" fill="${P.acento}" stroke="${P.tinta}" stroke-width="5" stroke-linejoin="round"/>`;
    body += `<path d="M${nx + 8 * -lado} ${ny + 14} l${-10 * lado} 32 l${16 * lado} -4 Z" fill="${P.acento}" stroke="${P.tinta}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  if (c.objeto) body += objetoMano(c.objeto, c.objetoMano === 'izq' ? mI : mD);
  const hRot = c.cabezaRot ?? 0;
  const headG = `<g transform="translate(${head[0].toFixed(1)} ${head[1].toFixed(1)}) rotate(${hRot})">` +
    (c.accesorio === 'rizos' || c.accesorio === 'cavernario' ? accesorio(c.accesorio, r) : '') +
    circulo(0, 0, r, P.cabeza, w) +
    cara(r, c.expr, c.ojos || [0.6 * lado, -0.4], lado, c.cara || {}) +
    (c.accesorio && !['rizos', 'cavernario'].includes(c.accesorio) ? accesorio(c.accesorio, r) : '') +
    `</g>`;
  const flip = c.mira === 'izq' ? ' scale(-1 1)' : '';
  // el flip sólo afecta al cuerpo; la cara ya respeta "lado"
  const sc = c.escala ?? 1;
  const sombra = c.sombra === false ? '' : `<ellipse cx="0" cy="${L.muslo + L.pierna - 4}" rx="70" ry="9" fill="#000" opacity="0.12"/>`;
  return `<g transform="translate(${c.x} ${c.y}) rotate(${c.rot ?? 0}) scale(${sc})">${sombra}<g transform="scale(1 1)${flip}">${body}</g>${headG}</g>`;
}

function objetoMano(tipo, [x, y]) {
  switch (tipo) {
    case 'llave': return `<g transform="translate(${x} ${y}) rotate(-30)"><rect x="-6" y="-8" width="12" height="60" rx="5" fill="#777" stroke="${P.tinta}" stroke-width="4"/><circle cx="0" cy="-16" r="16" fill="#777" stroke="${P.tinta}" stroke-width="4"/><circle cx="0" cy="-22" r="8" fill="#fff"/></g>`;
    case 'antorcha': return `<g transform="translate(${x} ${y})"><rect x="-6" y="-40" width="12" height="70" fill="#7a4b26" stroke="${P.tinta}" stroke-width="4"/>${fuego(0, -46, 0.7)}</g>`;
    case 'lanza': return `<g transform="translate(${x} ${y})">${linea(0, 90, 0, -150, 6, '#7a4b26')}<path d="M-12 -150 L0 -190 L12 -150Z" fill="#9aa" stroke="${P.tinta}" stroke-width="4"/></g>`;
    case 'microfono': return `<g transform="translate(${x} ${y}) rotate(-40)"><rect x="-8" y="-6" width="16" height="50" rx="6" fill="${P.tinta}"/><circle cx="0" cy="-12" r="12" fill="#333" stroke="${P.tinta}" stroke-width="3"/></g>`;
    default: return '';
  }
}

// ---------- Utilería ----------
function fuego(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">` +
    `<path d="M-38 30 L38 30 M-30 22 L32 36 M-30 36 L32 22" stroke="#7a4b26" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M0 -70 C18 -40 38 -30 30 4 C26 26 -26 26 -30 4 C-36 -24 -14 -30 -10 -50 C-4 -36 0 -40 0 -70Z" fill="#ff8a1e" stroke="#d24b0f" stroke-width="4"/>` +
    `<path d="M2 -34 C12 -18 20 -6 14 10 C8 22 -10 22 -14 8 C-18 -6 -6 -12 2 -34Z" fill="#ffd23a"/></g>`;
}
function sol(x, y, r = 130) {
  let o = circulo(x, y, r, P.sol, 6);
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + i / 8 * 0.8); o += linea(x + Math.cos(a) * (r + 22), y + Math.sin(a) * (r + 22), x + Math.cos(a) * (r + 50), y + Math.sin(a) * (r + 50), 5); }
  for (const a of [Math.PI * 1.02, -0.02 * Math.PI]) o += linea(x + Math.cos(a) * (r + 22), y + Math.sin(a) * (r + 22) , x + Math.cos(a) * (r + 60), y + Math.sin(a) * (r + 22), 5);
  return o;
}
function luna(x, y, r = 34) {
  return `<path d="M${x + r * 0.3} ${y - r} A${r} ${r} 0 1 0 ${x + r * 0.3} ${y + r} A${r * 0.78} ${r * 0.78} 0 1 1 ${x + r * 0.3} ${y - r}Z" fill="#fff"/>`;
}
function acacia(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 0 L-6 -70 L-40 -110 M-6 -70 L30 -112 M-4 -80 L-4 -112" stroke="#7b5534" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M-150 -118 Q-120 -150 -60 -150 Q-20 -168 40 -158 Q110 -160 150 -128 Q110 -108 40 -112 Q-40 -102 -150 -118Z" fill="#8f9a5a" stroke="${P.tinta}" stroke-width="4"/></g>`;
}
function texto(t) {
  const { x, y, txt, tam = 110, color = P.amarillo, borde = 14, fuente = 'Titulo', rot = 0, ancla = 'middle' } = t;
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><text text-anchor="${ancla}" font-family="${fuente}" font-size="${tam}" fill="${color}" stroke="${P.tinta}" stroke-width="${borde}" paint-order="stroke" stroke-linejoin="round" letter-spacing="2">${txt}</text></g>`;
}
function check(x, y, s = 1) { return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 30 L22 56 L70 -10" stroke="#5c9a45" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }

// ---------- Fondos ----------
function fondo(tipo, W, H) {
  switch (tipo) {
    case 'sabana': return `<rect width="${W}" height="${H}" fill="${P.cielo}"/><path d="M0 ${H * 0.72} Q${W / 2} ${H * 0.70} ${W} ${H * 0.72} L${W} ${H} L0 ${H}Z" fill="${P.arena}" stroke="#bfa96c" stroke-width="3"/>`;
    case 'cueva-noche': {
      let o = `<rect width="${W}" height="${H}" fill="${P.cueva}"/>`;
      for (let i = 0; i < 9; i++) { const xx = (i + 0.5) * W / 9 + j(30); o += linea(xx, 0, xx + j(40), H * 0.2 + R() * 120, 3, '#3e352b', 6); }
      o += `<path d="M${W * 0.6} ${H * 0.64} Q${W * 0.6} ${H * 0.2} ${W * 0.8} ${H * 0.18} Q${W * 1.0} ${H * 0.18} ${W * 0.99} ${H * 0.64} Z" fill="#121212" stroke="${P.tinta}" stroke-width="6"/>`;
      o += `<path d="M${W * 0.66} ${H * 0.5} Q${W * 0.68} ${H * 0.26} ${W * 0.82} ${H * 0.25} Q${W * 0.95} ${H * 0.26} ${W * 0.95} ${H * 0.42} Q${W * 0.86} ${H * 0.5} ${W * 0.78} ${H * 0.44} Q${W * 0.72} ${H * 0.52} ${W * 0.66} ${H * 0.5}Z" fill="${P.noche}"/>`;
      o += luna(W * 0.85, H * 0.33, 28);
      o += `<path d="M0 ${H * 0.6} Q${W * 0.5} ${H * 0.52} ${W} ${H * 0.62} L${W} ${H} L0 ${H}Z" fill="#8a7a5f" stroke="#3e352b" stroke-width="4"/>`;
      for (let i = 0; i < 26; i++) { const xx = R() * W, yy = H * 0.66 + R() * H * 0.32; o += linea(xx, yy, xx + 26 + R() * 20, yy - 4 + j(4), 3, '#5c4f3c'); }
      o += `<radialGradient id="luz" cx="0.38" cy="0.62" r="0.5"><stop offset="0" stop-color="#ffb347" stop-opacity="0.35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#luz)"/>`;
      return o;
    }
    case 'oceano': return `<rect width="${W}" height="${H}" fill="#123a5c"/><rect width="${W}" height="${H * 0.25}" fill="#5aa7d6"/><path d="M0 ${H * 0.25} q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V${H * 0.3} H0Z" fill="#2d6f9e"/><path d="M0 ${H * 0.9} Q${W / 2} ${H * 0.84} ${W} ${H * 0.9} V${H} H0Z" fill="#3a3326"/>`;
    case 'color': return `<rect width="${W}" height="${H}" fill="${P.cielo}"/>`;
    default: return `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  }
}

// ---------- Escena ----------
export function escenaSVG(esc) {
  const W = esc.ancho || 1280, H = esc.alto || 720;
  R = rng(esc.seed || 11);
  const font = (n, f, wgt) => `@font-face{font-family:${n};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(DIR, 'fonts', f)).toString('base64')}) format('woff2');font-weight:${wgt}}`;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>${font('Titulo', 'Fredoka-700.woff2', 700)}${font('Mano', 'PatrickHand-400.woff2', 400)}</style>`;
  o += fondo(esc.fondo, W, H);
  for (const el of esc.elementos || []) {
    switch (el.tipo) {
      case 'personaje': o += personaje(el); break;
      case 'fuego': o += fuego(el.x, el.y, el.escala); break;
      case 'sol': o += sol(el.x, el.y, el.r); break;
      case 'luna': o += luna(el.x, el.y, el.r); break;
      case 'acacia': o += acacia(el.x, el.y, el.escala); break;
      case 'texto': o += texto(el); break;
      case 'check': o += check(el.x, el.y, el.escala); break;
      case 'svg': o += el.svg; break;
    }
  }
  // grano de papel sutil: parte de la firma visual
  if (esc.grano !== false) o += `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter><rect width="${W}" height="${H}" filter="url(#g)"/>`;
  return o + '</svg>';
}

export async function renderPNG(esc, salida) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)('playwright');
  const svg = escenaSVG(esc);
  fs.writeFileSync(salida.replace(/\.png$/, '.svg'), svg);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: esc.ancho || 1280, height: esc.alto || 720 }, deviceScaleFactor: esc.dpr || 1 });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: salida, clip: { x: 0, y: 0, width: esc.ancho || 1280, height: esc.alto || 720 } });
  await b.close();
  return salida;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const f = process.argv[2];
  if (!f) { console.error('Uso: node render.mjs escena.json [salida.png]'); process.exit(1); }
  const esc = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = process.argv[3] || f.replace(/\.json$/, '.png').replace('escenas', 'salida');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  renderPNG(esc, out).then((x) => console.log('OK', x));
}
