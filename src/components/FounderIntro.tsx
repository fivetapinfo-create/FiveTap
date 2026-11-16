"use client";

import { useLayoutEffect, useState } from "react";
import { MARK_PATH } from "./Logo";

// Fixed (not random) so the server and the browser draw the same thing.
const LETTERS = [
  { c: "F", x: -150, y: -90, r: -38 },
  { c: "i", x: 110, y: -130, r: 30 },
  { c: "v", x: -70, y: 140, r: 24 },
  { c: "e", x: 160, y: 80, r: -32 },
  { c: "T", x: -170, y: 40, r: 46 },
  { c: "a", x: 60, y: -150, r: -22 },
  { c: "p", x: 130, y: 130, r: 38 },
];
const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 2 ? 0.14 : 0);
  const dist = 120 + ((i * 37) % 90);
  return { x: Math.round(Math.cos(angle) * dist), y: Math.round(Math.sin(angle) * dist * 0.62), gold: i % 3 !== 0, star: i % 4 === 0, s: 4 + ((i * 7) % 6), d: (i % 5) * 40 };
});

/**
 * The founder's entrance, once per session: the letters of FiveTap fly in from every side,
 * meet, and release a burst of small gold and white sparks; then the curtain opens.
 * About 2.6 seconds; skipped with reduced motion or on a repeat visit in the same session.
 */
export function FounderIntro() {
  const [show, setShow] = useState(true);
  useLayoutEffect(() => {
    const html = document.documentElement;
    let state = html.getAttribute("data-ft-intro-founder");
    if (!state) {
      let seen = false;
      try { seen = sessionStorage.getItem("ft-intro-founder") === "1"; if (!seen) sessionStorage.setItem("ft-intro-founder", "1"); } catch {}
      state = seen || matchMedia("(prefers-reduced-motion: reduce)").matches ? "skip" : "play";
      html.setAttribute("data-ft-intro-founder", state);
    }
    if (state === "skip") { setShow(false); return; }
    const t = setTimeout(() => { html.setAttribute("data-ft-intro-founder", "skip"); setShow(false); }, 2700);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const boot = `(function(){try{var h=document.documentElement;if(h.getAttribute('data-ft-intro-founder'))return;var s=sessionStorage.getItem('ft-intro-founder')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches;h.setAttribute('data-ft-intro-founder',s?'skip':'play');sessionStorage.setItem('ft-intro-founder','1')}catch(e){document.documentElement.setAttribute('data-ft-intro-founder','skip')}})();`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <div className="fi" aria-hidden="true">
        <div className="fi-stage">
          <span className="fi-glow" />
          <svg className="fi-mark" viewBox="0 0 100 100"><path d={MARK_PATH} /></svg>
          <span className="fi-word">
            {LETTERS.map((l, i) => (
              <span key={i} className="fi-l" style={{ "--x": `${l.x}px`, "--y": `${l.y}px`, "--r": `${l.r}deg`, "--i": i } as React.CSSProperties}>{l.c}</span>
            ))}
          </span>
          <span className="fi-sparks">
            {SPARKS.map((p, i) => (
              <i key={i} className={`${p.gold ? "g" : "w"}${p.star ? " st" : ""}`} style={{ "--tx": `${p.x}px`, "--ty": `${p.y}px`, "--s": `${p.s}px`, "--d": `${p.d}ms` } as React.CSSProperties} />
            ))}
          </span>
          <span className="fi-sub">FOUNDER</span>
        </div>
      </div>
    </>
  );
}
