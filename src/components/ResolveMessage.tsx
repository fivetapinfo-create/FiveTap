"use client";

import { useTransition } from "react";
import { snack } from "@/components/Snackbar";

/**
 * "Marcar resuelto" with an undo: the message is marked at once and a bar at the
 * bottom offers to undo it for a few seconds, so a wrong tap costs nothing.
 */
export function ResolveMessage({ token, id, resolved, action }: { token: string; id: string; resolved: boolean; action: (f: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  const send = (value: boolean) => {
    const f = new FormData();
    f.set("token", token);
    f.set("feedback_id", id);
    f.set("resolved", value ? "1" : "0");
    return action(f);
  };
  return (
    <button className={`btn btn-sm ${resolved ? "btn-ghost" : "btn-dark"}`} type="button" disabled={pending}
      onClick={() => {
        const next = !resolved;
        start(() => send(next));
        snack(next ? "Mensaje resuelto" : "Mensaje reabierto", () => send(!next));
      }}>
      {resolved ? "Reabrir" : "Marcar resuelto ✓"}
    </button>
  );
}
