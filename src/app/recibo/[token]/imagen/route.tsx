import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/Logo";
import { human } from "@/lib/agenda";
import { METHOD_LABEL, receiptByToken, receiptMoney } from "@/lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The receipt as an image (PNG, 1080 wide), to save in the gallery or share. Built from the
 * receipt's own data, never a capture of the animation. The link carries the receipt's token.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const r = await receiptByToken((await params).token);
  if (!r) return new Response("No encontrado", { status: 404 });
  const fonts = path.join(process.cwd(), "src", "fonts");
  const [regular, bold] = await Promise.all([readFile(path.join(fonts, "Satoshi-500.ttf")), readFile(path.join(fonts, "Satoshi-700.ttf"))]);
  const method = (METHOD_LABEL as Record<string, string>)[r.method] ?? r.method;
  const rows: [string, string][] = [
    ["Negocio", r.venue_name],
    ["Recibo", r.number],
    ["Concepto", r.concept],
    ["Plan", r.plan_label],
    ...(r.period_start && r.period_end ? [["Período", `${human(r.period_start)} – ${human(r.period_end)}`] as [string, string]] : []),
    ["Fecha de pago", human(r.paid_on)],
    ["Método", method],
    ...(r.reference ? [["Transacción", r.reference] as [string, string]] : []),
    ["Estado", r.status === "void" ? "Anulado" : "Pagado y confirmado"],
  ];
  const dl = new URL(req.url).searchParams.get("dl") === "1";
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f1", fontFamily: "Satoshi" }}>
        <div style={{ width: 900, display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: 40, padding: "64px 72px", boxShadow: "0 30px 80px rgba(0,0,0,0.10)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="54" height="54" viewBox="0 0 100 100"><path d={MARK_PATH} fill="#0a0a0a" /></svg>
              <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>FiveTap</span>
            </div>
            <span style={{ fontSize: 26, color: r.status === "void" ? "#b42318" : "#157f45", fontWeight: 700, background: r.status === "void" ? "#fdecea" : "#e8f5ec", padding: "10px 22px", borderRadius: 999 }}>{r.status === "void" ? "ANULADO" : "PAGADO"}</span>
          </div>
          <span style={{ marginTop: 48, fontSize: 28, color: "#5c5b57" }}>Recibo de pago</span>
          <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, marginTop: 4 }}>{receiptMoney(r.amount)}</span>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36, borderTop: "2px dashed #e4e2dc", paddingTop: 28, gap: 18 }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 30, fontSize: 30 }}>
                <span style={{ color: "#5c5b57" }}>{k}</span>
                <span style={{ fontWeight: 700, textAlign: "right", maxWidth: 520 }}>{v}</span>
              </div>
            ))}
          </div>
          <span style={{ marginTop: 40, fontSize: 24, color: "#8a8984" }}>Comprobante emitido por FiveTap · {r.number}</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: [{ name: "Satoshi", data: regular, weight: 500 }, { name: "Satoshi", data: bold, weight: 700 }] },
  );
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex");
  if (dl) headers.set("Content-Disposition", `attachment; filename="Recibo-${r.number}-FiveTap.png"`);
  return new Response(img.body, { status: 200, headers });
}
