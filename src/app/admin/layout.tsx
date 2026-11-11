import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ADMIN_HEADER } from "@/lib/admin-session";
import { agenda, billingAll, todayPanama } from "@/lib/agenda";
import { unreadCount } from "@/lib/data";
import { siteUrlIsLocal } from "@/lib/site";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = {
  title: "Panel — FiveTap",
  robots: { index: false, follow: false },
  manifest: "/panel.webmanifest",
  appleWebApp: { capable: true, title: "FiveTap", statusBarStyle: "black" },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The sign-in page shares this layout: show nothing of the panel until signed in.
  if ((await headers()).get(ADMIN_HEADER) !== "1") return <div className="admin">{children}</div>;
  const day = todayPanama();
  const [unread, todo, late] = await Promise.all([
    unreadCount().catch(() => 0),
    agenda(day, day).then((t) => t.filter((x) => x.kind !== "mensajes").length).catch(() => 0),
    billingAll(day).then((r) => r.filter((x) => x.billing.kind === "late" || x.billing.kind === "suspended").length).catch(() => 0),
  ]);
  return (
    <div className="admin">
      <header className="admin-top no-print">
        <div className="container">
          <Link href="/admin"><Logo size={20} /></Link>
          <AdminNav todo={todo} unread={unread} late={late} />
        </div>
      </header>
      {siteUrlIsLocal && process.env.NODE_ENV === "production" && (
        <div className="container no-print" style={{ paddingTop: 16 }}>
          <p className="alert alert-warn">
            Falta <b>NEXT_PUBLIC_SITE_URL</b>: los enlaces NFC y QR apuntan a localhost. Configúralo antes de grabar placas.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
