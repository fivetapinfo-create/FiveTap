import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, LOCK_COOKIE, UNLOCK_COOKIE, isAdminSession, isUnlocked } from "./admin-session";

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
