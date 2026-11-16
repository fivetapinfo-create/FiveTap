"use client";

import { useEffect } from "react";

/**
 * On a Face ID device: while the founder is using the panel the unlock stays alive; after a few
 * minutes away (app in the background, phone locked, or just idle) the panel asks for Face ID again.
 */
export function PanelLock({ minutes }: { minutes: number }) {
  useEffect(() => {
    const limit = minutes * 60_000 - 15_000;
    let lastPing = Date.now();
    let lastActive = Date.now();
    let hiddenAt = 0;
    const lock = () => window.location.reload(); // the server sends a locked panel to Face ID
    const ping = async () => {
      try {
        const r = await fetch("/admin/ping", { cache: "no-store", redirect: "manual" });
        if (r.type === "opaqueredirect" || r.status === 401) return lock();
        lastPing = Date.now();
      } catch {}
    };
    const active = () => {
      if (Date.now() - lastPing > limit) return lock();
      lastActive = Date.now();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > limit) lock();
      else void ping();
    };
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActive < 90_000) void ping();
      else if (Date.now() - lastPing > limit) lock();
    }, 60_000);
    window.addEventListener("pointerdown", active, { capture: true });
    window.addEventListener("keydown", active, { capture: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(tick);
      window.removeEventListener("pointerdown", active, { capture: true });
      window.removeEventListener("keydown", active, { capture: true });
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [minutes]);
  return null;
}
