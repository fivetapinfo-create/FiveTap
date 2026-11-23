import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { FounderIntro } from "@/components/FounderIntro";
import { PanelLock } from "@/components/PanelLock";
import { Logo } from "@/components/Logo";
import { ADMIN_HEADER, LOCK_COOKIE, UNLOCK_MINUTES } from "@/lib/admin-session";
import { agenda, billingAll, todayPanama } from "@/lib/agenda";
import { unreadCount } from "@/lib/data";
import { siteUrlIsLocal } from "@/lib/site";
import { openTicketsCount } from "@/lib/support";
import { pendingClaimsCount } from "@/lib/claims";
import { AdminNav } from "./AdminNav";
import { ScrollFx } from "@/components/ScrollFx";

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
  const [unread, todo, late, support, claims] = await Promise.all([
    unreadCount().catch(() => 0),
    agenda(day, day).then((t) => t.filter((x) => x.kind !== "mensajes").length).catch(() => 0),
    billingAll(day).then((r) => r.filter((x) => x.billing.kind === "late" || x.billing.kind === "suspended").length).catch(() => 0),
    openTicketsCount().catch(() => 0),
    pendingClaimsCount().catch(() => 0),
  ]);
  const faceId = (await cookies()).get(LOCK_COOKIE)?.value === "1";
  return (
    <div className="admin">
      <FounderIntro />
      <ScrollFx />
      {faceId && <PanelLock minutes={UNLOCK_MINUTES} />}
      <header className="admin-top no-print">
        <div className="container">
          <Link href="/admin"><Logo size={20} /></Link>
          <AdminNav todo={todo} unread={unread} late={late + claims} support={support} />
        </div>
      </header>
      {siteUrlIsLocal && process.env.NODE_ENV === "production" && (
        <div className="container no-print" style={{ paddingTop: 16 }}>
          <p className="alert alert-warn">
            Falta <b>NEXT_PUBLIC_SITE_URL</b>: los enlaces NFC apuntan a localhost. Configúralo antes de grabar placas.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
