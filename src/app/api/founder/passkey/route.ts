import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/admin-session";
import { audit } from "@/lib/receipts";
import { authenticationOptions, finishAuthentication, finishRegistration, registrationOptions } from "@/lib/passkeys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Founder passkeys. Adding a device needs the panel session; signing in does not (that is the point). */
export async function POST(req: Request) {
  let body: { step?: string; response?: unknown; name?: string };
  try { body = await req.json(); } catch { return json({ error: "Solicitud no válida." }, 400); }
  const signedIn = await isAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
  try {
    switch (body.step) {
      case "register-options":
        if (!signedIn) return json({ error: "Entra a tu panel para agregar una llave de acceso." }, 401);
        return json(await registrationOptions());
      case "register-verify":
        if (!signedIn) return json({ error: "Entra a tu panel para agregar una llave de acceso." }, 401);
        await finishRegistration(body.response as never, String(body.name ?? ""));
        await audit("founder.passkey_added", { entity: "admin_passkey", details: { name: String(body.name ?? "").slice(0, 60) } });
        return json({ ok: true });
      case "login-options": {
        const o = await authenticationOptions();
        return o ? json(o) : json({ error: "Aún no hay llaves de acceso en este sitio." }, 404);
      }
      case "login-verify":
        await finishAuthentication(body.response as never);
        await audit("founder.passkey_login", { entity: "admin_passkey" });
        return json({ ok: true });
      default:
        return json({ error: "Paso desconocido." }, 400);
    }
  } catch (e) {
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: e instanceof Error ? e.message : "No se pudo completar." }, 400);
  }
}
