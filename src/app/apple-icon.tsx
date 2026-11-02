import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" width={116} height={116}>
          <path fill="#fff" d={MARK_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
