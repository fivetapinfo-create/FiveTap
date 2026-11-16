// Keeps the Face ID unlock alive while the founder is using the panel (the middleware renews it).
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
