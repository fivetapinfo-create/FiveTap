// Waiter avatars: one low-poly family (same proportions, light and finish), with controlled
// variety. Client-safe: only the look's settings live here; the 3D drawing is in WaiterAvatar.

export type AvatarBody = "m" | "f";
export type AvatarConfig = { body: AvatarBody; skin: number; hair: number; hairColor: number; brows: number };

export const SKINS = ["#f2d0b5", "#e8b896", "#d79f7c", "#c08560", "#9c6a49", "#704a33"];
export const HAIR_COLORS = ["#1d1a18", "#3b2a20", "#5a3a26", "#7a4b2c", "#a3683b", "#c79a5e"];
export const SKIN_LABEL = ["Muy claro", "Claro", "Medio claro", "Medio", "Moreno", "Oscuro"];
export const HAIR_COLOR_LABEL = ["Negro", "Castaño oscuro", "Castaño", "Castaño claro", "Cobrizo", "Rubio oscuro"];
export const HAIR_STYLES: Record<AvatarBody, string[]> = {
  m: ["Corto clásico", "Copete", "Rizado corto", "Rapado"],
  f: ["Largo suelto", "Bob", "Cola de caballo", "Moño"],
};

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/** Any stored value (or nothing) as a complete look; without one, a stable look from the person's id. */
export function asAvatar(v: unknown, seed = ""): AvatarConfig {
  const o = (v && typeof v === "object" ? v : {}) as Partial<AvatarConfig>;
  const h = hash(seed || "fivetap");
  const body: AvatarBody = o.body === "f" || o.body === "m" ? o.body : h % 2 ? "f" : "m";
  const pick = (val: unknown, n: number, salt: number) => (Number.isInteger(val) && (val as number) >= 0 && (val as number) < n ? (val as number) : (h >>> salt) % n);
  return { body, skin: pick(o.skin, SKINS.length, 3), hair: pick(o.hair, 4, 7), hairColor: pick(o.hairColor, HAIR_COLORS.length, 11), brows: pick(o.brows, 3, 15) };
}

export type AvatarMood = "idle" | "happy" | "celebrate" | "thanks" | "neutral" | "worried";
/** How the avatar answers a rating. */
export const moodFor = (stars: number): AvatarMood => (stars >= 5 ? "celebrate" : stars === 4 ? "happy" : stars === 3 ? "thanks" : "worried");

/** A new look in the same family; never the same as the one it replaces. */
export function randomAvatar(body: AvatarBody, avoid?: AvatarConfig): AvatarConfig {
  for (let i = 0; i < 20; i++) {
    const r = (n: number) => Math.floor(Math.random() * n);
    const c: AvatarConfig = { body, skin: r(SKINS.length), hair: r(4), hairColor: r(HAIR_COLORS.length), brows: r(3) };
    if (!avoid || c.body !== avoid.body || c.skin !== avoid.skin || c.hair !== avoid.hair || c.hairColor !== avoid.hairColor) return c;
  }
  return { body, skin: 1, hair: 0, hairColor: 0, brows: 1 };
}
