// Founder login: a long-lived cookie instead of the browser's password box, so
// the panel also works as an app installed on the phone. Edge-safe (middleware).

export const ADMIN_COOKIE = "ft_admin";
export const ADMIN_COOKIE_DAYS = 180;
/** Set by the middleware on signed-in requests. */
export const ADMIN_HEADER = "x-fivetap-admin";

/** Cookie value: an HMAC of the password, so changing the password logs everyone out. */
export async function adminSessionValue(password: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("fivetap-admin-session-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** The founder's passwords: the main one and an optional backup (ADMIN_BACKUP_PASSWORD). */
export function adminPasswords() {
  return [process.env.ADMIN_PASSWORD, process.env.ADMIN_BACKUP_PASSWORD].filter((p): p is string => Boolean(p && p.length >= 8));
}

/** True when the cookie was issued for one of the founder's current passwords. */
export async function isAdminSession(cookie: string | undefined) {
  if (!cookie) return false;
  for (const p of adminPasswords()) if (safeEqual(cookie, await adminSessionValue(p))) return true;
  return false;
}
