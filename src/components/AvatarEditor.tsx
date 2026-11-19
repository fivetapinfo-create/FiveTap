"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { HAIR_COLORS, HAIR_COLOR_LABEL, HAIR_STYLES, SKINS, SKIN_LABEL, type AvatarConfig } from "@/lib/avatar";

const WaiterAvatar = dynamic(() => import("./avatar3d/WaiterAvatar").then((m) => m.WaiterAvatar), { ssr: false, loading: () => <div className="wa wa-loading" /> });

/** Choose how the person's avatar looks; the 3D preview changes as you pick. Fields post with the form. */
export function AvatarEditor({ initial, logoUrl, name }: { initial: AvatarConfig; logoUrl: string | null; name: string }) {
  const [c, setC] = useState(initial);
  const set = (k: keyof AvatarConfig, v: number | string) => setC((x) => ({ ...x, [k]: v, ...(k === "body" ? { hair: 0 } : {}) }));
  const swatch = (list: string[], labels: string[], k: "skin" | "hairColor") => (
    <div className="ae-swatches" role="radiogroup" aria-label={k === "skin" ? "Tono de piel" : "Color de cabello"}>
      {list.map((hex, i) => (
        <button key={hex} type="button" role="radio" aria-checked={c[k] === i} aria-label={labels[i]} title={labels[i]} className={c[k] === i ? "on" : undefined} style={{ background: hex }} onClick={() => set(k, i)} />
      ))}
    </div>
  );
  return (
    <div className="ae">
      <div className="ae-stage"><WaiterAvatar config={c} logoUrl={logoUrl} mood="happy" label={name} /></div>
      <div className="ae-fields">
        {(["body", "skin", "hair", "hairColor", "brows"] as const).map((k) => <input key={k} type="hidden" name={k} value={String(c[k])} />)}
        <div className="ae-seg" role="radiogroup" aria-label="Figura">
          <button type="button" className={c.body === "m" ? "on" : undefined} onClick={() => set("body", "m")}>Mesero</button>
          <button type="button" className={c.body === "f" ? "on" : undefined} onClick={() => set("body", "f")}>Mesera</button>
        </div>
        <span className="ae-label">Tono de piel</span>{swatch(SKINS, SKIN_LABEL, "skin")}
        <span className="ae-label">Peinado</span>
        <div className="ae-seg ae-wrap">{HAIR_STYLES[c.body].map((h, i) => <button key={h} type="button" className={c.hair === i ? "on" : undefined} onClick={() => set("hair", i)}>{h}</button>)}</div>
        <span className="ae-label">Color de cabello</span>{swatch(HAIR_COLORS, HAIR_COLOR_LABEL, "hairColor")}
        <span className="ae-label">Cejas</span>
        <div className="ae-seg">{["Finas", "Medias", "Marcadas"].map((h, i) => <button key={h} type="button" className={c.brows === i ? "on" : undefined} onClick={() => set("brows", i)}>{h}</button>)}</div>
      </div>
    </div>
  );
}
