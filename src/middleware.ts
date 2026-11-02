import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_HEADER, adminSessionValue, safeEqual } from "@/lib/admin-session";

// The internal panel: one founder, no accounts. Signed in with a cookie from
// /admin/entrar; HTTP Basic auth still works for scripts.
export async function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse("Panel cerrado: define ADMIN_PASSWORD.", { status: 503 });
  // The layout shows the panel only when this header says so; never trust one sent from outside.
  const headers = new Headers(req.headers);
  headers.delete(ADMIN_HEADER);
  const pass = () => {
    headers.set(ADMIN_HEADER, "1");
    return NextResponse.next({ request: { headers } });
  };
  if (req.nextUrl.pathname === "/admin/entrar") return NextResponse.next({ request: { headers } });

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await adminSessionValue(password))) return pass();

  const header = req.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const i = decoded.indexOf(":");
    if (safeEqual(decoded.slice(0, i), process.env.ADMIN_USER || "admin") && safeEqual(decoded.slice(i + 1), password)) return pass();
  }

  if (req.method !== "GET") return new NextResponse("Acceso restringido", { status: 401 });
  const login = new URL("/admin/entrar", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
