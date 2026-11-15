import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "@/components/Icons";
import { LiveRefresh } from "@/components/LiveRefresh";
import { onColor, safeColor } from "@/lib/brand";
import { tagByCode } from "@/lib/data";
import { orderByToken, type OrderStatus } from "@/lib/orders";
import { COPY } from "@/lib/i18n";
import { guestRequest } from "../../request";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ code: string; token: string }>; searchParams: Promise<{ l?: string }> };

const STEPS: OrderStatus[] = ["new", "preparing", "ready", "delivered"];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The guest follows their order: received, being prepared, ready. Refreshes by itself. */
export default async function OrderStatusPage({ params, searchParams }: Props) {
  const [{ code, token }, sp, req] = await Promise.all([params, searchParams, guestRequest()]);
  const tag = await tagByCode(code);
  if (!tag) notFound();
  const o = await orderByToken(tag.business_id, token);
  if (!o) notFound();
  const copy = sp.l === "en" || sp.l === "es" ? COPY[sp.l] : req.copy;
  const brand = safeColor(tag.business.brand_color, "#0a0a0a");
  const custom = brand.toLowerCase() !== "#0a0a0a" && brand.toLowerCase() !== "#111111";
  const style = (custom ? { "--brand": brand, "--on-brand": onColor(brand) } : {}) as React.CSSProperties;
  const at = STEPS.indexOf(o.status);
  const done = o.status === "delivered" || o.status === "canceled";

  return (
    <main className="guest gx ob" style={style}>
      {!done && <LiveRefresh seconds={10} />}
      <div className="guest-wrap gx-wrap">
        <div className="ob-done">
          <div className={`check-badge rise${o.status === "canceled" ? " ob-canceled" : ""}`}><Check /></div>
          <p className="guest-name rise" style={{ "--i": 1 } as React.CSSProperties}>{tag.business.name}{o.table_label ? ` · ${o.table_label}` : ""}</p>
          <h1 className="guest-title rise" style={{ "--i": 2 } as React.CSSProperties}>{copy.oNumber.replace("{n}", String(o.number))}</h1>
          <p className="guest-lead rise" style={{ "--i": 3 } as React.CSSProperties}><b>{copy.oStatus[o.status]}</b> · {copy.oStatusHint[o.status]}</p>
        </div>
        {o.status !== "canceled" && (
          <ol className="ob-steps" aria-label={copy.oNumber.replace("{n}", String(o.number))}>
            {STEPS.map((s, n) => <li key={s} className={n <= at ? "on" : undefined}><span />{copy.oStatus[s]}</li>)}
          </ol>
        )}
        {o.modified && <p className="alert alert-warn">{copy.oModified}</p>}
        <ul className="ob-summary gx-card">
          {o.lines.filter((l) => l.qty > 0).map((l) => <li key={l.id}><span>{l.qty} × {l.name}</span><span className="num">{usd(l.line_total)}</span></li>)}
          <li className="ob-total"><span>{copy.oTotal}</span><span className="num">{usd(o.total)}</span></li>
        </ul>
        <p className="muted" style={{ fontSize: 14, textAlign: "center", marginTop: 12 }}>{copy.oPay}{!done ? ` ${copy.oLive}` : ""}</p>
        <a className="btn btn-ghost btn-block" href={`/t/${code}/pedir`} style={{ marginTop: 12 }}>{copy.oAnother}</a>
        <a className="guest-back" href={`/t/${code}?preview=1`} style={{ justifyContent: "center" }}>← {copy.oBack}</a>
      </div>
    </main>
  );
}
