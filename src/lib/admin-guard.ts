import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, LOCK_COOKIE, UNLOCK_COOKIE, adminPasswords, isAdminSession, isUnlocked, safeEqual } from "./admin-session";

/**
 * Every founder server action calls this first. The middleware already guards /admin pages,
 * but a server action can be posted to any route, so each action checks the session itself
 * (the same rules as the middleware: a valid session, and unlocked on a Face ID device).
 */
export async function assertAdmin() {
  const jar = await cookies();
  if (!(await isAdminSession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/entrar");
  if (jar.get(LOCK_COOKIE)?.value === "1" && !(await isUnlocked(jar.get(UNLOCK_COOKIE)?.value))) redirect("/admin/entrar?bloqueado=1");
}

/**
 * Same check for the founder's downloads (CSV, PDF, documents): the middleware guards them,
 * and each one checks again so a middleware mistake never exposes data. Accepts the session
 * cookie (unlocked on a Face ID device) or HTTP Basic auth, like the middleware.
 */
export async function adminAllowed(): Promise<boolean> {
  const jar = await cookies();
  if (await isAdminSession(jar.get(ADMIN_COOKIE)?.value)) {
    return jar.get(LOCK_COOKIE)?.value !== "1" || (await isUnlocked(jar.get(UNLOCK_COOKIE)?.value));
  }
  const [scheme, encoded] = ((await headers()).get("authorization") ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const i = decoded.indexOf(":");
  return i > 0 && safeEqual(decoded.slice(0, i), process.env.ADMIN_USER || "admin") && adminPasswords().some((p) => safeEqual(decoded.slice(i + 1), p));
}

export const notAllowed = () => new Response("Acceso restringido", { status: 401 });
