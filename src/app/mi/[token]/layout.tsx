import { IntroSplash } from "@/components/IntroSplash";
import { OwnerTabs } from "@/components/OwnerTabs";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Snackbar } from "@/components/Snackbar";
import { ScrollFx } from "@/components/ScrollFx";
import { Island } from "@/components/Island";
import { accessRole } from "@/lib/access";
import { businessByOwnerToken } from "@/lib/data";
import { accessOf } from "@/lib/entitlements";
import { db } from "@/lib/supabase";

/**
 * FiveTap Business opens with its animation, once per session. Once the person is
 * in, every section shares the same bottom bar, pull-to-refresh and notices.
 */
export default async function OwnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await businessByOwnerToken(token).catch(() => null);
  const role = b ? await accessRole(b).catch(() => null) : null;
  let shell: React.ReactNode = null;
  if (b && role) {
    const [acc, open] = await Promise.all([
      accessOf(b).catch(() => null),
      db().from("feedback").select("id", { count: "exact", head: true }).eq("business_id", b.id).is("resolved_at", null),
    ]);
    shell = (
      <>
        <OwnerTabs token={token} team={b.mode === "full" && Boolean(acc?.has.team)} clients={Boolean(acc?.has.clients)} pending={open.count ?? 0} />
        <PullToRefresh />
        <Snackbar />
        <ScrollFx />
        <Island />
      </>
    );
  }
  return (
    <>
      <IntroSplash variant="business" />
      {children}
      {shell}
    </>
  );
}
