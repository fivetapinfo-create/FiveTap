import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/Logo";

/**
 * App icon for the installed FiveTap app, with room for round masks.
 * Founder's panel: white mark on black. Venues (owner, manager): black mark on white,
 * so both apps are told apart on the same phone.
 */
export function appIcon(size: number, { badge = false, owner = false } = {}) {
  const mark = Math.round(size * (badge ? 0.8 : 0.56));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: badge ? "transparent" : owner ? "#ffffff" : "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" width={mark} height={mark}>
          <path fill={owner ? "#0a0a0a" : "#fff"} d={MARK_PATH} />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
