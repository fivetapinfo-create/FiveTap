"use client";

import { useState } from "react";

/** A small copy button for guests (labels come from the page's language). */
export function CopyText({ value, label, done }: { value: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="gx-copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* clipboard blocked: the text stays visible to copy by hand */ }
      }}
    >
      {ok ? done : label}
    </button>
  );
}
