import "server-only";
import QRCode from "qrcode";
import { MARK_PATH } from "@/components/Logo";
import { SITE_URL } from "./site";

export type InstallRole = "dueno" | "gerente";

/** The venue's private FiveTap Business link, set to open the install steps for this role. */
export const installUrl = (ownerToken: string, role: InstallRole) => `${SITE_URL}/mi/${ownerToken}?instalar=1&rol=${role}`;

/**
 * The install QR with the FiveTap mark in the middle. High error correction (30%) keeps it
 * readable with the mark covering the center, and a 4-module quiet zone lets any phone
 * camera (iPhone and Android) find it fast. Black on white, as scanners expect.
 */
export async function installQrSvg(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const quiet = 4;
  const size = n + quiet * 2;
  let dots = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) dots += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  // Center badge: about 22% of the code, well inside what level H can lose.
  const badge = Math.round(n * 0.22);
  const bx = (size - badge) / 2;
  const mark = badge * 0.62;
  const mx = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Código QR de FiveTap Business">
<rect width="${size}" height="${size}" fill="#ffffff"/>
<path d="${dots}" fill="#0a0a0a"/>
<rect x="${bx - 0.6}" y="${bx - 0.6}" width="${badge + 1.2}" height="${badge + 1.2}" rx="${badge * 0.26}" fill="#ffffff" shape-rendering="geometricPrecision"/>
<rect x="${bx}" y="${bx}" width="${badge}" height="${badge}" rx="${badge * 0.22}" fill="#0a0a0a" shape-rendering="geometricPrecision"/>
<svg x="${mx}" y="${mx}" width="${mark}" height="${mark}" viewBox="0 0 100 100" shape-rendering="geometricPrecision"><path d="${MARK_PATH}" fill="#ffffff"/></svg>
</svg>`;
}
