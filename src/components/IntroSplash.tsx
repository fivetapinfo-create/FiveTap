"use client";

import { useLayoutEffect, useState } from "react";
import { MARK_PATH } from "./Logo";

type Variant = "founder" | "business";

/**
 * Opening animation, once per session: the FiveTap mark is traced and filled, the name and
 * the product line rise from their own masks, a hairline loads, then the content lifts and
 * the curtain follows. About 2.5 seconds; skipped with reduced motion.
 * An inline script decides before the first paint, so a repeat visit never flashes it.
 */
export function IntroSplash({ variant }: { variant: Variant }) {
  const [show, setShow] = useState(true);
  const attr = `data-ft-intro-${variant}`;
  const key = `ft-intro-${variant}`;

  useLayoutEffect(() => {
    const html = document.documentElement;
    let state = html.getAttribute(attr);
    if (!state) {
      // Reached by navigating inside the app (e.g. right after signing in).
      let seen = false;
      try {
        seen = sessionStorage.getItem(key) === "1";
        if (!seen) sessionStorage.setItem(key, "1");
      } catch {}
      state = seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "skip" : "play";
      html.setAttribute(attr, state);
    }
    if (state === "skip") {
      setShow(false);
      return;
    }
    const t = setTimeout(() => {
      html.setAttribute(attr, "skip");
      setShow(false);
    }, 2700);
    return () => clearTimeout(t);
  }, [attr, key]);

  if (!show) return null;
  const boot = `(function(){try{var h=document.documentElement;if(h.getAttribute('${attr}'))return;var s=sessionStorage.getItem('${key}')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches;h.setAttribute('${attr}',s?'skip':'play');sessionStorage.setItem('${key}','1')}catch(e){document.documentElement.setAttribute('${attr}','skip')}})();`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <div className={`intro intro-${variant}`} aria-hidden="true">
        <div className="intro-inner">
          <svg className="intro-mark" viewBox="-3 -3 106 106">
            <path className="intro-trace" pathLength={1} d={MARK_PATH} />
            <path className="intro-solid" d={MARK_PATH} />
          </svg>
          <div className="intro-text">
            <span className="intro-line"><b>FiveTap</b></span>
            <span className="intro-line"><small>{variant === "founder" ? "Founder" : "Business"}</small></span>
          </div>
        </div>
        <span className="intro-bar"><i /></span>
      </div>
    </>
  );
}
