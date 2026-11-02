import { downloadPrivate } from "@/lib/company";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("No encontrado", { status: 404 });
  const { data } = await db().from("documents").select("path, title").eq("id", id).maybeSingle();
  if (!data) return new Response("No encontrado", { status: 404 });
  const blob = await downloadPrivate(data.path as string);
  if (!blob) return new Response("No encontrado", { status: 404 });
  const ext = String(data.path).split(".").pop() ?? "pdf";
  return new Response(blob, {
    headers: {
      "Content-Type": TYPE[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="documento.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
