"use client";

import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void> };

/**
 * "Guardar en mi teléfono": installs the card on the home screen. Android/Chrome offers the
 * install prompt; iPhone shows the two taps (Share → Add to Home Screen). Hidden once installed.
 */
export function CardSaveHint({ fresh, copy }: { fresh: boolean; copy: { save: string; ios: string; android: string; saved: string } }) {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(fresh);
  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIP); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (installed) return null;
  return (
    <div className="lc-save">
      <button
        type="button"
        className="btn btn-dark btn-block"
        onClick={async () => { if (prompt) { await prompt.prompt(); setPrompt(null); } else setOpen(true); }}
      >
        {copy.save}
      </button>
      {open && !prompt && <p className="lc-save-how">{ios ? copy.ios : copy.android} {copy.saved}</p>}
    </div>
  );
}
