"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import type { RateState } from "@/app/t/[code]/atencion/actions";
import { moodFor, type AvatarConfig } from "@/lib/avatar";

const WaiterAvatar = dynamic(() => import("./avatar3d/WaiterAvatar").then((m) => m.WaiterAvatar), { ssr: false, loading: () => <div className="wa wa-loading" /> });

type Copy = { rate: string; comment: string; issueQ: string; send: string; pick: string; say5: string; say4: string; say3: string; sayLow: string; dup: string; private: string; googleQ: string; google: string; back: string; error: string; issues: Record<string, string> };

/** One screen: the person's avatar, five stars, an optional comment, send. The avatar answers the rating. */
export function RateWaiter({ action, hidden, person, logoUrl, business, googleHref, homeHref, copy, backdrop, floor }: {
  action: (prev: RateState, f: FormData) => Promise<RateState>;
  hidden: Record<string, string>;
  person: { name: string; title: string; message: string | null; avatar: AvatarConfig };
  logoUrl: string | null; business: string; googleHref?: string; homeHref: string | null; copy: Copy; backdrop?: string | null; floor?: [string, string] | null;
}) {
  const [state, send, pending] = useActionState(action, { ok: false } as RateState);
  const [stars, setStars] = useState(0);
  const [issue, setIssue] = useState("");
  const done = state.ok;
  const given = state.stars ?? stars;
  const mood = done ? moodFor(given) : stars ? (stars >= 4 ? "happy" : stars === 3 ? "neutral" : "worried") : "idle";
  const say = done ? (state.duplicate ? copy.dup : given >= 5 ? copy.say5 : given === 4 ? copy.say4 : given === 3 ? copy.say3 : copy.sayLow) : person.message;

  return (
    <section className={`rw-card${done ? " is-done" : ""}${backdrop ? " has-scene" : ""}`}>
      <div className="rw-stage">
        <WaiterAvatar config={person.avatar} logoUrl={logoUrl} mood={done ? mood : stars ? mood : "idle"} say={done || !stars ? say : null} label={person.name} backdrop={backdrop} floor={floor} />
      </div>
      <div className="rw-id"><b>{person.name}</b><small>{person.title} · {business}</small></div>
      {!done ? (
        <form action={send} className="rw-form">
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label className="hp" aria-hidden="true">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          <h1 className="rw-q">{copy.rate}</h1>
          <div className="rw-stars" role="radiogroup" aria-label={copy.rate}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n}`} className={n <= stars ? "on" : undefined} onClick={() => setStars(n)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={stars || ""} />
          {stars > 0 && stars <= 3 && (
            <fieldset className="rw-issues">
              <legend>{copy.issueQ}</legend>
              {Object.entries(copy.issues).map(([k, label]) => (
                <button key={k} type="button" className={issue === k ? "on" : undefined} aria-pressed={issue === k} onClick={() => setIssue(issue === k ? "" : k)}>{label}</button>
              ))}
              <input type="hidden" name="issue" value={issue} />
            </fieldset>
          )}
          {stars > 0 && <textarea className="input rw-comment" name="comment" rows={3} maxLength={600} placeholder={copy.comment} />}
          {state.error && <p className="alert alert-error" role="alert">{state.error === "stars" ? copy.pick : copy.error}</p>}
          <button type="submit" className="btn btn-brand btn-block rw-send" disabled={!stars || pending}>{pending ? "…" : copy.send}</button>
          <small className="rw-private">{copy.private}</small>
        </form>
      ) : (
        <div className="rw-after">
          {/* The Google review lives on the table plaque; this screen only thanks the guest. */}
          {homeHref && <a className="btn btn-ghost btn-block" href={homeHref}>{copy.back}</a>}
        </div>
      )}
    </section>
  );
}
