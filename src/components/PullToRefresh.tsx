"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const PULL = 70;

/**
 * Pull down from the top to refresh, like any phone app. Only in the installed app:
 * a browser tab already has its own pull-to-refresh.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dist, setDist] = useState(0);
  const from = useRef<number | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const down = (e: TouchEvent) => { from.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null; };
    const move = (e: TouchEvent) => {
      if (from.current === null) return;
      const d = e.touches[0].clientY - from.current;
      setDist(d > 0 ? Math.min(d * 0.5, PULL + 30) : 0);
    };
    const up = () => {
      setDist((d) => {
        if (d >= PULL) start(() => router.refresh());
        return 0;
      });
      from.current = null;
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [router]);

  if (!dist && !pending) return null;
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${pending ? 16 : dist - 24}px)` }} aria-live="polite">
      <span className={`ptr-ic${pending || dist >= PULL ? " ready" : ""}${pending ? " spinning" : ""}`} style={pending ? undefined : { rotate: `${dist * 3}deg` }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
      </span>
      <span className="sr-only">{pending ? "Actualizando" : dist >= PULL ? "Suelta para actualizar" : ""}</span>
    </div>
  );
}
