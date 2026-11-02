"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_COOKIE_DAYS, adminSessionValue, safeEqual } from "@/lib/admin-session";

const safeNext = (v: string) => (v.startsWith("/admin") && !v.startsWith("/admin/entrar") ? v : "/admin");

export async function signIn(f: FormData) {
  const next = safeNext(String(f.get("next") ?? ""));
  const user = String(f.get("user") ?? "").trim();
  const pass = String(f.get("password") ?? "");
  const password = process.env.ADMIN_PASSWORD ?? "";
  const ok = password && safeEqual(user.toLowerCase(), (process.env.ADMIN_USER || "admin").toLowerCase()) && safeEqual(pass, password);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // Slows down guessing.
    redirect(`/admin/entrar?error=1&next=${encodeURIComponent(next)}`);
  }
  (await cookies()).set(ADMIN_COOKIE, await adminSessionValue(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_DAYS * 86_400,
  });
  redirect(next);
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/entrar");
}
