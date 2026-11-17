import "server-only";
import { headers } from "next/headers";
import { SITE_URL } from "./site";

/** The address this request came in on (works on any domain or server); SITE_URL as the fallback. */
export async function requestOrigin() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]!.trim();
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return SITE_URL;
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0]!.trim() || (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
