"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; className?: string; badge?: "todo" | "unread" }[] = [
  { href: "/admin", label: "Negocios", className: "hide-sm" },
  { href: "/admin/agenda", label: "Agenda", badge: "todo" },
  { href: "/admin/mensajes", label: "Mensajes", badge: "unread" },
  { href: "/admin/contratos", label: "Contratos" },
  { href: "/admin/empresa", label: "Empresa" },
];

/** Panel menu; the current section is highlighted the moment it's tapped. */
export function AdminNav({ todo, unread }: { todo: number; unread: number }) {
  const path = usePathname();
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/b/") : path.startsWith(href));
  return (
    <nav className="admin-nav">
      {LINKS.map((l) => {
        const n = l.badge === "todo" ? todo : l.badge === "unread" ? unread : 0;
        return (
          <Link key={l.href} href={l.href} className={l.className} aria-current={current(l.href) ? "page" : undefined}>
            {l.label}
            {n > 0 && <span className="badge num" aria-label={l.badge === "todo" ? `${n} para hoy` : `${n} sin leer`}>{n}</span>}
          </Link>
        );
      })}
      <Link className="btn btn-light btn-sm" href="/admin/new" aria-label="Nuevo negocio">+<span className="hide-sm"> Nuevo</span></Link>
    </nav>
  );
}
