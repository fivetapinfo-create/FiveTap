import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { onColor, safeColor } from "@/lib/brand";
import { guestClosed, tagByCode } from "@/lib/data";
import { db } from "@/lib/supabase";
import { moduleOn } from "@/lib/orders";
import { guestRequest } from "../request";
import { Inactive } from "../Inactive";
import { OrderBuilder } from "./OrderBuilder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> };

/** Ordering from a plaque: the business's catalog with prices, a cart and the table already known. */
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ code }, sp, req] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag || (await guestClosed(tag))) return <Inactive copy={req.copy} />;
  if (!moduleOn(tag.business, "orders")) redirect(`/t/${code}`);
  const { data } = await db().from("catalog_items").select("id, name, description, price, image_url, category").eq("business_id", tag.business_id).eq("active", true).not("price", "is", null).order("category").order("sort").order("created_at");
  const items = ((data ?? []) as { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string | null }[]).map((i) => ({ ...i, price: Number(i.price) }));
  const b = tag.business;
  const brand = safeColor(b.brand_color, "#0a0a0a");
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = (custom ? { "--brand": brand, "--on-brand": onColor(brand) } : {}) as React.CSSProperties;
  const copy = req.copy;
  const needWhere = tag.kind === "waiter";

  return (
    <main className="guest gx ob" style={style}>
      <div className="guest-wrap gx-wrap">
        <a className="guest-back" href={`/t/${code}?preview=1`}>← {copy.oBack}</a>
        <div className="ob-head">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={brand} className="biz-logo" />
          <div>
            <h1 className="guest-title" style={{ marginTop: 0 }}>{copy.oTitle}</h1>
            <p className="guest-lead">{needWhere ? copy.oLead : copy.oLeadTable.replace("{table}", tag.label)}</p>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="gx-card"><p className="muted">{copy.oNoItems}</p></div>
        ) : (
          <OrderBuilder items={items} copy={copy} code={code} needWhere={needWhere} error={sp.error} />
        )}
      </div>
    </main>
  );
}
