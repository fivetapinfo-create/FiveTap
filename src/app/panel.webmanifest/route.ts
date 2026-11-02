import { manifest } from "@/lib/manifest";

export const dynamic = "force-static";

// The founder's panel as an app. Lives outside /admin because browsers fetch
// manifests without the login cookie.
export function GET() {
  return manifest({ id: "/admin", name: "FiveTap · Panel", start: "/admin/agenda", scope: "/admin" });
}
