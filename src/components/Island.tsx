"use client";

import { useEffect, useState } from "react";

/**
 * A "Dynamic Island" style notice: a dark pill at the top that grows out with a spring,
 * says what just happened (copied, saved, shared) and folds back. Mounted once per panel;
 * anything calls island("…"). A short vibration where the phone supports it (Android).
 */
type Kind = "ok" | "error" | "share";
type Note = { id: number; text: string; kind: Kind };
let push: ((n: Note) => void) | null = null;
let seq = 0;

export function island(text: string, kind: Kind = "ok") {
  push?.({ id: ++seq, text, kind });
  try { if (kind !== "error") navigator.vibrate?.(12); else navigator.vibrate?.([20, 40, 20]); } catch { /* no haptics */ }
}

const Icon = ({ kind }: { kind: Kind }) =>
  kind === "error" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
  ) : kind === "share" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  );

export function Island() {
  const [n, setN] = useState<Note | null>(null);
  const [out, setOut] = useState(false);
  useEffect(() => {
    push = (x) => { setOut(false); setN(x); };
    return () => { push = null; };
  }, []);
  useEffect(() => {
    if (!n) return;
    const a = setTimeout(() => setOut(true), 1900);
    const b = setTimeout(() => setN(null), 2250);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [n]);
  if (!n) return null;
  return (
    <div className={`island island-${n.kind}${out ? " out" : ""}`} role="status" aria-live="polite" key={n.id}>
      <span className="island-ic"><Icon kind={n.kind} /></span>
      <span className="island-txt">{n.text}</span>
    </div>
  );
}
