import { KIND_NAME, PIECE_LABEL, pieceState } from "@/lib/pieces";
import { nfcUrl } from "@/lib/site";
import { db } from "@/lib/supabase";
import type { Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const day = (iso: string | null) => (iso ? new Date(Date.parse(iso) - 5 * 3600_000).toISOString().slice(0, 10) : "");

/** The whole NFC inventory as a spreadsheet (backup or to print). Founder only (under /admin). */
export async function GET() {
  const [tagRes, statRes, lastRes] = await Promise.all([
    db().from("tags").select("*, business:businesses(name)").order("created_at"),
    db().from("tag_stats").select("tag_id, scans_30d"),
    db().from("tag_last_tap").select("tag_id, last_at"),
  ]);
  const scans = new Map(((statRes.data ?? []) as { tag_id: string; scans_30d: number }[]).map((r) => [r.tag_id, r.scans_30d]));
  const last = new Map(((lastRes.data ?? []) as { tag_id: string; last_at: string }[]).map((r) => [r.tag_id, r.last_at]));
  const rows = [
    ["Nombre", "Cliente", "Tipo", "Estado", "Código", "Enlace grabado en el chip", "Creada", "Grabada", "Entregada", "Retirada", "Toques 30 días", "Último toque", "Notas"],
    ...((tagRes.data ?? []) as (Tag & { business: { name: string } | null })[]).map((t) => [
      t.label, t.business?.name ?? "", KIND_NAME[t.kind], PIECE_LABEL[pieceState(t)], t.code, nfcUrl(t.code),
      day(t.created_at), day(t.written_at), day(t.delivered_at), day(t.retired_at), scans.get(t.id) ?? 0, day(last.get(t.id) ?? null), t.note ?? "",
    ]),
  ];
  return new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="placas-fivetap.csv"`, "Cache-Control": "no-store" },
  });
}
