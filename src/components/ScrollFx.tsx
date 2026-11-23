"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll styles for the Founder panel and Fivetap Business, all in one place:
 * zoom out (the hero shrinks into the page), blur in, tilt in, mask reveal, count up,
 * shrinking header and stacking cards (CSS), plus snap rows (CSS). Pages need no changes:
 * this tags the elements it knows. Nothing moves when the phone asks for reduced motion.
 */
const RULES: [selector: string, fx: string][] = [
  [".admin-main > :not(.owner-hero):not(.admin-head):not(script)", "fx-blur"],
  [".kpis > .kpi, .glance-row > *, .qa-grid > *, .cc-grid > *, .ct-list > li, .tp-row, .rec-card", "fx-tilt"],
  [".admin-main img", "fx-mask"],
];
const COUNT = ".kpi > b, .glance-row b.num, .owner-hero > b.num, .cc-n, .tp-score, .cc-grid b.num";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Animates the number inside an element from 0, keeping its prefix, suffix, commas and decimals. */
function countUp(el: HTMLElement) {
  if (el.dataset.fxCount || el.childElementCount > 0) return;
  const text = el.textContent ?? "";
  const m = text.match(/^(\D*?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(.*)$/s);
  if (!m) return;
  const [, pre, int, dec = "", post] = m;
  const target = Number(int.replace(/,/g, "") + dec);
  if (!Number.isFinite(target) || target === 0) return;
  el.dataset.fxCount = "1";
  const decimals = dec ? dec.length - 1 : 0;
  const commas = int.includes(",");
  const fmt = (n: number) => {
    const fixed = n.toFixed(decimals);
    if (!commas) return fixed;
    const [i, d] = fixed.split(".");
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? `.${d}` : "");
  };
  const start = performance.now();
  const dur = Math.min(1400, 700 + Math.log10(target + 1) * 180);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = `${pre}${fmt(target * ease(t))}${post}`;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = text; // exactly what the server rendered
  };
  requestAnimationFrame(step);
}

export function ScrollFx() {
  const path = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("fx-on");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("fx-in");
          if (el.matches(COUNT)) countUp(el);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    const tag = () => {
      for (const [sel, fx] of RULES) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          if (el.dataset.fx) return;
          if (fx === "fx-mask" && (el.closest(".admin-top") || el.getBoundingClientRect().width < 28)) return;
          el.dataset.fx = fx;
          // Stagger siblings a little, so a row of cards arrives one after another.
          const i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
          el.style.setProperty("--fx-i", String(Math.min(i, 8)));
          el.classList.add(fx);
          io.observe(el);
        });
      }
      document.querySelectorAll<HTMLElement>(COUNT).forEach((el) => {
        if (el.dataset.fxWatch) return;
        el.dataset.fxWatch = "1";
        io.observe(el);
      });
      document.querySelectorAll<HTMLElement>(".fx-stack > .msg").forEach((el, i) => el.style.setProperty("--fx-i", String(Math.min(i, 6))));
    };
    tag();

    // New content after a refresh or an action: tag it too (debounced).
    let timer = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(tag, 80);
    });
    // The whole body: a loading screen may be swapped for the page after this runs.
    mo.observe(document.body, { childList: true, subtree: true });

    // Zoom out + shrinking header: one cheap scroll handler, at most once per frame.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        root.style.setProperty("--fx-top", Math.min(1, Math.max(0, y / 260)).toFixed(3));
        root.classList.toggle("fx-scrolled", y > 12);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [path]);

  return null;
}
