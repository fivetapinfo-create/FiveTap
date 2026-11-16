"use client";

import { useLayoutEffect, useState } from "react";

// Fixed (not random) so the server and the browser draw the same thing.
const LETTERS = [
  { c: "F", x: -56, y: -34, r: -8 },
  { c: "i", x: 30, y: -48, r: 6 },
  { c: "v", x: -24, y: 46, r: 5 },
  { c: "e", x: 48, y: 30, r: -6 },
  { c: "T", x: -50, y: 18, r: 8 },
  { c: "a", x: 22, y: -44, r: -5 },
  { c: "p", x: 44, y: 42, r: 7 },
];
const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 2 ? 0.14 : 0);
  const dist = 120 + ((i * 37) % 90);
  return { x: Math.round(Math.cos(angle) * dist), y: Math.round(Math.sin(angle) * dist * 0.62), silver: i % 3 === 0, star: i % 4 === 0, s: 3 + ((i * 7) % 5), d: (i % 5) * 45 };
});

/**
 * The founder's entrance, once per session: the letters of FiveTap drift in and meet, a wave
 * of light runs across them with a burst of small white and silver sparks, the word holds for
 * a moment, then the curtain opens to the sign-in. About 4 seconds; skipped with reduced
 * motion or on a repeat visit in the same session.
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
    const t = setTimeout(() => { html.setAttribute("data-ft-intro-founder", "skip"); setShow(false); }, 4300);
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
          <span className="fi-word">
            {LETTERS.map((l, i) => (
              <span key={i} className="fi-l" style={{ "--x": `${l.x}px`, "--y": `${l.y}px`, "--r": `${l.r}deg`, "--i": i } as React.CSSProperties}>{l.c}</span>
            ))}
          </span>
          <span className="fi-sparks">
            {SPARKS.map((p, i) => (
              <i key={i} className={`${p.silver ? "s" : "w"}${p.star ? " st" : ""}`} style={{ "--tx": `${p.x}px`, "--ty": `${p.y}px`, "--s": `${p.s}px`, "--d": `${p.d}ms` } as React.CSSProperties} />
            ))}
          </span>
          <span className="fi-sub">FOUNDER</span>
        </div>
      </div>
    </>
  );
}
