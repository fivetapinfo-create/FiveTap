import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Business } from "./types";

// Optional 4-digit PIN for FiveTap Business. The private link still opens the app; with a
// PIN set, each phone asks for it once and then remembers it (cookie, 180 days). Changing
// or removing the PIN locks every phone again.

export const PIN_RE = /^\d{4}$/;
const cookieName = (b: Pick<Business, "id">) => `ft_pin_${b.id.slice(0, 8)}`;
const cookieValue = (b: Pick<Business, "owner_token" | "owner_pin_hash">) =>
  createHmac("sha256", b.owner_token).update(b.owner_pin_hash ?? "").digest("hex");

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function pinMatches(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pin, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the venue has no PIN, or this phone already entered it. */
export async function pinUnlocked(b: Pick<Business, "id" | "owner_token" | "owner_pin_hash">) {
  if (!b.owner_pin_hash) return true;
  return (await cookies()).get(cookieName(b))?.value === cookieValue(b);
}

export async function rememberPin(b: Pick<Business, "id" | "owner_token" | "owner_pin_hash">) {
  (await cookies()).set(cookieName(b), cookieValue(b), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/mi/${b.owner_token}`,
    maxAge: 180 * 86_400,
  });
}
