"use client";

import { useEffect, useState } from "react";

const KEY = "fivetap-theme";

/** Light or dark for the panel and FiveTap Business, saved on this device. */
export function ThemeToggle({ className = "owner-gear", labelled = false }: { className?: string; labelled?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // Private mode: the choice lasts until the page closes.
    }
  }

  const label = dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  const icon = dark ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
  );
  return labelled ? (
    <button type="button" className={className} onClick={toggle} aria-pressed={dark}>
      {icon} {dark ? "Tema oscuro activado · cambiar a claro" : "Tema claro activado · cambiar a oscuro"}
    </button>
  ) : (
    <button type="button" className={className} onClick={toggle} aria-label={label} title={label}>
      {icon}
    </button>
  );
}

/** Runs before the page paints, so a saved dark theme never flashes light. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
