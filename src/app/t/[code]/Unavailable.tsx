import type { Copy } from "@/lib/i18n";

/** A waiter card that is off, unassigned, or belonged to someone who left: nothing old is shown. */
export function Unavailable({ copy, business }: { copy: Copy; business?: string }) {
  return (
    <main className="guest">
      <div className="guest-wrap" style={{ textAlign: "center", paddingTop: 80 }}>
        <h1 className="guest-title">{copy.wGone}</h1>
        <p className="guest-lead">{copy.wGoneBody}{business ? ` · ${business}` : ""}</p>
      </div>
    </main>
  );
}
