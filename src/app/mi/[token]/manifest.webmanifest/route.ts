import { businessByOwnerToken } from "@/lib/data";
import { manifest } from "@/lib/manifest";

export const dynamic = "force-dynamic";

/** Installs the owner's page as "FiveTap" on their phone, opening straight to their venue. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await businessByOwnerToken(token);
  if (!b) return new Response("Not found", { status: 404 });
  const home = `/mi/${token}`;
  // iPhone keeps the installed app's storage apart from Safari, so the role chosen
  // when installing travels in the start URL.
  const rol = new URL(req.url).searchParams.get("rol") === "gerente" ? "gerente" : "dueno";
  return manifest({ id: home, name: `FiveTap · ${b.name}`, start: `${home}?app=1&rol=${rol}`, scope: home, icon: "owner" });
}
