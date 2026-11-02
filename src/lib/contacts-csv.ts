import "server-only";
import type { Contact, Tag } from "./types";
import { formatPhone } from "./phone";

const cell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Excel-friendly CSV (BOM so accents open correctly) of a venue's club. */
export function contactsCsv(contacts: Contact[], tags: Tag[], filename: string) {
  const label = new Map(tags.map((t) => [t.id, t.label]));
  const rows = [
    ["Nombre", "WhatsApp", "Cumpleaños", "Se unió en", "Fecha"],
    ...contacts.map((c) => [
      c.name,
      formatPhone(c.phone),
      c.birthday_month && c.birthday_day ? `${c.birthday_day}/${c.birthday_month}` : "",
      (c.tag_id && label.get(c.tag_id)) || "",
      c.created_at.slice(0, 10),
    ]),
  ];
  const body = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
