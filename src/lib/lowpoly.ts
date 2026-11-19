// Turns a photo into a low-poly picture (flat-colored triangles) in the browser, so the venue's
// photo matches the avatars' faceted style. More triangles where the photo has detail (edges).
import Delaunator from "delaunator";

export async function lowPoly(file: File, opts: { width?: number; points?: number } = {}): Promise<Blob> {
  const img = await createImageBitmap(file);
  const W = Math.min(opts.width ?? 1400, img.width);
  const H = Math.round((img.height / img.width) * W);
  const src = document.createElement("canvas");
  src.width = W; src.height = H;
  const sx = src.getContext("2d", { willReadFrequently: true })!;
  sx.drawImage(img, 0, 0, W, H);
  const px = sx.getImageData(0, 0, W, H).data;
  const lum = (x: number, y: number) => { const i = (y * W + x) * 4; return 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!; };
  // Edge strength (Sobel), used to place more points where there is detail.
  const edges: number[] = [];
  let sum = 0;
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
    const gx = lum(x + 1, y) - lum(x - 1, y), gy = lum(x, y + 1) - lum(x, y - 1);
    const e = Math.min(255, Math.hypot(gx, gy));
    edges.push(x, y, e); sum += e;
  }
  const want = opts.points ?? Math.round((W * H) / 140);
  const pts: number[] = [0, 0, W - 1, 0, 0, H - 1, W - 1, H - 1];
  for (let i = 0; i <= 12; i++) pts.push((W - 1) * (i / 12), 0, (W - 1) * (i / 12), H - 1, 0, (H - 1) * (i / 12), W - 1, (H - 1) * (i / 12));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Half the points follow the edges, half are spread evenly so flat walls still get facets.
  for (let k = 0; k < edges.length; k += 3) if (rnd() < (edges[k + 2]! / sum) * want * 0.6) pts.push(edges[k]! + rnd() * 2, edges[k + 1]! + rnd() * 2);
  for (let i = 0; i < want * 0.45; i++) pts.push(rnd() * (W - 1), rnd() * (H - 1));
  const d = new Delaunator(pts);
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ox = out.getContext("2d")!;
  const t = d.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i]! * 2, b = t[i + 1]! * 2, c = t[i + 2]! * 2;
    const ax = pts[a]!, ay = pts[a + 1]!, bx = pts[b]!, by = pts[b + 1]!, cx = pts[c]!, cy = pts[c + 1]!;
    // Average color of a few points inside the triangle.
    let r = 0, gg = 0, bb = 0, n = 0;
    for (const [u, v] of [[1 / 3, 1 / 3], [0.6, 0.2], [0.2, 0.6], [0.2, 0.2]] as const) {
      const x = Math.round(ax + u * (bx - ax) + v * (cx - ax)), y = Math.round(ay + u * (by - ay) + v * (cy - ay));
      const j = (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4;
      r += px[j]!; gg += px[j + 1]!; bb += px[j + 2]!; n++;
    }
    ox.fillStyle = `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(bb / n)})`;
    ox.strokeStyle = ox.fillStyle;
    ox.lineWidth = 0.6;
    ox.beginPath(); ox.moveTo(ax, ay); ox.lineTo(bx, by); ox.lineTo(cx, cy); ox.closePath(); ox.fill(); ox.stroke();
  }
  return await new Promise<Blob>((ok) => out.toBlob((b) => ok(b!), "image/jpeg", 0.88));
}
