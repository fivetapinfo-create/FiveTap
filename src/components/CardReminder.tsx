"use client";

import { useEffect, useState } from "react";

const keyBytes = (b: string) => Uint8Array.from(atob((b + "=".repeat((4 - (b.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Voluntary reminders for this card (close to the reward, reward ready). Off with one tap. */
export function CardReminder({ endpoint, copy }: { endpoint: string; copy: { on: string; off: string; done: string; ios: string } }) {
  const [state, setState] = useState<"idle" | "on" | "busy" | "unsupported" | "ios">("idle");
  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return setState(ios && !standalone ? "ios" : "unsupported");
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      setState(sub ? "on" : "idle");
    })();
  }, []);
  if (state === "unsupported") return null;
  if (state === "ios") return <p className="lc2-note">{copy.ios}</p>;
  return (
    <button type="button" className="btn btn-ghost btn-block lc2-remind" disabled={state === "busy"} onClick={async () => {
      setState("busy");
      try {
        const reg = await navigator.serviceWorker.ready;
        if (state === "on") {
          const sub = await reg.pushManager.getSubscription();
          if (sub) { await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
          return setState("idle");
        }
        if ((await Notification.requestPermission()) !== "granted") return setState("idle");
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
        setState(r.ok ? "on" : "idle");
      } catch { setState("idle"); }
    }}>
      {state === "on" ? copy.off : copy.on}
    </button>
  );
}
