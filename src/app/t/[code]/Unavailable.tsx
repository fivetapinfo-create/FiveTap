import type { Copy } from "@/lib/i18n";

/** A waiter card that is off, not given to anyone yet, or belonged to someone who left: nothing old is shown. */
export function Unavailable({ copy, business, reason = "off" }: { copy: Copy; business?: string; reason?: "off" | "unassigned" }) {
  return (
    <main className="guest">
      <div className="guest-wrap" style={{ textAlign: "center", paddingTop: 80 }}>
        <h1 className="guest-title">{reason === "unassigned" ? copy.wFree : copy.wGone}</h1>
        <p className="guest-lead">{reason === "unassigned" ? copy.wFreeBody : copy.wGoneBody}{business ? ` · ${business}` : ""}</p>
      </div>
    </main>
  );
}
