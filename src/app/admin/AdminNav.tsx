"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

// Three things used every day, the rest under "Más".
const MAIN: { href: string; label: string; badge?: "todo" | "unread" | "late" }[] = [
  { href: "/admin", label: "Hoy", badge: "todo" },
  { href: "/admin/cobros", label: "Cobros", badge: "late" },
  { href: "/admin/mensajes", label: "Mensajes", badge: "unread" },
];
const MORE: { href: string; label: string; hint: string }[] = [
  { href: "/admin/placas", label: "Placas", hint: "Inventario de placas y tarjetas NFC" },
  { href: "/admin/agenda", label: "Agenda", hint: "La semana y el calendario" },
  { href: "/admin/comprobantes", label: "Recibos y facturación", hint: "Recibos, PDFs y envíos" },
  { href: "/admin/contratos", label: "Contratos", hint: "Contratos de 3 meses" },
  { href: "/admin/planes", label: "Planes", hint: "Precios y lo que incluye cada plan" },
  { href: "/admin/empresa", label: "Empresa", hint: "Datos de FiveTap e ingresos" },
];

/** Panel menu; the current section is highlighted the moment it's tapped. */
export function AdminNav({ todo, unread, late = 0 }: { todo: number; unread: number; late?: number }) {
  const path = usePathname();
  const more = useRef<HTMLDetailsElement>(null);
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/b/") || path === "/admin/new" : path.startsWith(href));
  const inMore = MORE.some((l) => current(l.href));
  return (
    <nav className="admin-nav">
      {MAIN.map((l) => {
        const n = l.badge === "todo" ? todo : l.badge === "unread" ? unread : l.badge === "late" ? late : 0;
        return (
          <Link key={l.href} href={l.href} aria-current={current(l.href) ? "page" : undefined}>
            {l.label}
            {n > 0 && <span className="badge num" aria-label={l.badge === "todo" ? `${n} para hoy` : l.badge === "late" ? `${n} con pago atrasado` : `${n} sin leer`}>{n}</span>}
          </Link>
        );
      })}
      <details className="nav-more" ref={more}>
        <summary aria-current={inMore ? "page" : undefined}>Más</summary>
        <div className="nav-more-menu">
          {MORE.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => more.current?.removeAttribute("open")} aria-current={current(l.href) ? "page" : undefined}>
              <b>{l.label}</b>
              <small>{l.hint}</small>
            </Link>
          ))}
        </div>
      </details>
      <ThemeToggle className="owner-gear" />
    </nav>
  );
}
