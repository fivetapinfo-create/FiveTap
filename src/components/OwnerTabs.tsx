"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chart, Chat, Gear, Home, Users } from "@/components/Icons";

/**
 * FiveTap Business tab bar: the same five places at the bottom of every section,
 * with the current one highlighted, so the owner never has to go back to find them.
 */
export function OwnerTabs({ token, team, clients, pending }: { token: string; team: boolean; clients: boolean; pending: number }) {
  const path = usePathname() ?? "";
  const base = `/mi/${token}`;
  if (path.startsWith(`${base}/activar`)) return null;
  const at = (p: string) => (p === base ? path === base : path.startsWith(p));
  const tabs = [
    { href: base, label: "Inicio", icon: <Home />, on: at(base) },
    { href: `${base}#mensajes`, label: "Mensajes", icon: <Chat />, badge: pending, on: false },
    team
      ? { href: `${base}/equipo`, label: "Equipo", icon: <Users />, on: at(`${base}/equipo`) }
      : { href: `${base}/reporte`, label: "Reporte", icon: <Chart />, on: at(`${base}/reporte`) },
    clients
      ? { href: `${base}/clientes`, label: "Clientes", icon: <Users />, on: at(`${base}/clientes`) || at(`${base}/fidelidad`) }
      : { href: `${base}#club`, label: "Club", icon: <Users />, on: false },
    { href: `${base}/ajustes`, label: "Ajustes", icon: <Gear />, on: at(`${base}/ajustes`) },
  ];
  return (
    <nav className="owner-tabs" aria-label="Secciones">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} aria-current={t.on ? "page" : undefined} className={t.on ? "on" : undefined}>
          {t.icon}
          {t.label}
          {t.badge ? <i className="num">{t.badge}</i> : null}
        </Link>
      ))}
    </nav>
  );
}
