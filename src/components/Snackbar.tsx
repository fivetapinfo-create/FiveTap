"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Snack = { id: number; text: string; undo?: () => Promise<unknown> | void };
let push: ((s: Snack) => void) | null = null;
let seq = 0;

/** Shows a short notice at the bottom, with an optional "Deshacer". */
export function snack(text: string, undo?: Snack["undo"]) {
  push?.({ id: ++seq, text, undo });
}

/** Mounted once in FiveTap Business; any action can call snack(). */
export function Snackbar() {
  const router = useRouter();
  const [s, setS] = useState<Snack | null>(null);
  useEffect(() => {
    push = setS;
    return () => { push = null; };
  }, []);
  useEffect(() => {
    if (!s) return;
    const t = setTimeout(() => setS(null), 5000);
    return () => clearTimeout(t);
  }, [s]);
  if (!s) return null;
  return (
    <div className="snackbar" role="status" key={s.id}>
      <span>{s.text}</span>
      {s.undo && (
        <button type="button" onClick={async () => { const u = s.undo; setS(null); await u?.(); router.refresh(); }}>Deshacer</button>
      )}
    </div>
  );
}
