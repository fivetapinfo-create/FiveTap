import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/Logo";

export const alt = "FiveTap — Plataforma de reputación y clientes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card WhatsApp and Instagram show when the landing link is shared.
export default async function OpenGraph() {
  const bold = await readFile(join(process.cwd(), "src/fonts/Satoshi-700.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Satoshi" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg viewBox="0 0 100 100" width={150} height={150}>
            <path fill="#fff" d={MARK_PATH} />
          </svg>
          <span style={{ fontSize: 132, letterSpacing: "-0.03em" }}>FiveTap</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 30, letterSpacing: "0.32em", color: "rgba(255,255,255,0.72)" }}>
          REPUTACIÓN QUE SE MIDE.
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Satoshi", data: bold, weight: 700, style: "normal" }] },
  );
}
