"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { AvatarConfig, AvatarMood } from "@/lib/avatar";

const WaiterAvatar = dynamic(() => import("@/components/avatar3d/WaiterAvatar").then((m) => m.WaiterAvatar), { ssr: false });

const MOODS: { k: AvatarMood; label: string; say: string }[] = [
  { k: "idle", label: "En espera", say: "" },
  { k: "celebrate", label: "5 estrellas", say: "¡Wow, gracias! Me alegraste el día." },
  { k: "happy", label: "4 estrellas", say: "¡Qué bueno que te gustó!" },
  { k: "thanks", label: "3 estrellas", say: "Gracias, vamos a mejorar." },
  { k: "worried", label: "1–2 estrellas", say: "Lo siento mucho. Ya le avisé al encargado." },
];

/** Preview of the two main characters with the final uniform, and how they react to each rating. */
export function AvatarLab({ people }: { people: { name: string; config: AvatarConfig }[] }) {
  const [m, setM] = useState(0);
  const mood = MOODS[m]!;
  return (
    <main className="av-lab">
      <h1>Avatares FiveTap · familia low-poly</h1>
      <p className="muted">Uniforme: camisa negra de manga corta, delantal de cintura, pantalón y zapatos negros. El logo del restaurante va en el pecho.</p>
      <div className="av-lab-row">
        {people.map((p) => (
          <figure key={p.name}>
            <WaiterAvatar config={p.config} mood={mood.k} say={mood.say || null} className="av-lab-stage" label={p.name} />
            <figcaption>{p.name}</figcaption>
          </figure>
        ))}
      </div>
      <nav className="av-lab-moods">
        {MOODS.map((x, i) => <button key={x.k} type="button" className={`btn btn-sm ${i === m ? "btn-dark" : "btn-ghost"}`} onClick={() => setM(i)} data-mood={x.k}>{x.label}</button>)}
      </nav>
    </main>
  );
}
