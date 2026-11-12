import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/Logo";
import { type InstallRole, installQrSvg, installUrl } from "@/lib/install-qr";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLE: Record<InstallRole, string> = { dueno: "Para el dueño", gerente: "Para el gerente o encargado" };

/**
 * A ready-to-send card (PNG, 1080 × 1350) with the venue's install QR: send it by
 * WhatsApp or print it. Only from the panel: the QR is the venue's private access.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });
  const { data: b } = await db().from("businesses").select("name, owner_token, slug").eq("id", id).maybeSingle();
  if (!b) return new Response("No encontrado", { status: 404 });
  const role: InstallRole = new URL(req.url).searchParams.get("para") === "gerente" ? "gerente" : "dueno";
  const svg = await installQrSvg(installUrl(b.owner_token, role));
  const qr = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const fonts = path.join(process.cwd(), "src", "fonts");
  const [regular, bold] = await Promise.all([readFile(path.join(fonts, "Satoshi-500.ttf")), readFile(path.join(fonts, "Satoshi-700.ttf"))]);

  const step = (n: string, title: string, text: string) => (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ width: 52, height: 52, borderRadius: 26, background: "#d4af37", color: "#0a0a0a", fontSize: 28, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#0a0a0a" }}>{title}</div>
        <div style={{ fontSize: 26, color: "#5c5b57" }}>{text}</div>
      </div>
    </div>
  );

  const res = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#f6f5f1", display: "flex", flexDirection: "column", padding: 64, fontFamily: "Satoshi" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 100 100" width={34} height={34}><path d={MARK_PATH} fill="#ffffff" /></svg>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0a0a0a", letterSpacing: -1 }}>FiveTap Business</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 44, gap: 6 }}>
          <div style={{ fontSize: 26, color: "#5c5b57", letterSpacing: 3, textTransform: "uppercase" }}>{ROLE[role]}</div>
          <div style={{ fontSize: 58, fontWeight: 700, color: "#0a0a0a", letterSpacing: -2, lineHeight: 1.05 }}>{b.name}</div>
        </div>

        <div style={{ display: "flex", marginTop: 36, background: "#ffffff", borderRadius: 40, padding: 36, alignItems: "center", gap: 40, border: "2px solid rgba(10,10,10,0.08)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image, not a page */}
          <img src={qr} width={430} height={430} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#0a0a0a", lineHeight: 1.1 }}>Escanea con la cámara</div>
            <div style={{ fontSize: 26, color: "#5c5b57", lineHeight: 1.35 }}>Funciona en iPhone y Android. No necesitas tienda de apps ni contraseña.</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 44 }}>
          {step("1", "Abre el enlace", "Apunta la cámara al código y toca el aviso que aparece.")}
          {step("2", "Agrégala a tu inicio", "iPhone: Compartir → Agregar a inicio. Android: Instalar FiveTap.")}
          {step("3", "Activa los avisos", "Abre FiveTap desde el ícono blanco y toca Activar avisos.")}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "#8a8984" }}>Acceso privado de {b.name}. Compártelo solo con tu equipo de confianza.</div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Satoshi", data: regular, weight: 500, style: "normal" },
        { name: "Satoshi", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
  const download = new URL(req.url).searchParams.get("dl") === "1";
  if (download) res.headers.set("Content-Disposition", `attachment; filename="FiveTap-Business-${b.slug}-${role}.png"`);
  return res;
}
