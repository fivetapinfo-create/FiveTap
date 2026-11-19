"use client";

import { useEffect, useState } from "react";
import type { AvatarConfig } from "@/lib/avatar";

type Person = { ref: string; name: string; title: string; avatar: AvatarConfig; href: string };

/** The team as cards with their avatar; the pictures are drawn one by one with a single 3D renderer. */
export function StaffPicker({ people, logoUrl }: { people: Person[]; logoUrl: string | null }) {
  const [pics, setPics] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const { avatarPicture } = await import("./avatar3d/WaiterAvatar");
      for (const p of people) {
        const url = await avatarPicture(p.avatar, logoUrl, 180, 230);
        if (!alive) return;
        if (url) setPics((x) => ({ ...x, [p.ref]: url }));
      }
    })();
    return () => { alive = false; };
  }, [people, logoUrl]);
  return (
    <nav className="sp-grid" aria-label="Equipo">
      {people.map((p) => (
        <a key={p.ref} className="sp-card" href={p.href}>
          <span className="sp-pic">{pics[p.ref] ? <img src={pics[p.ref]} alt="" /> : <span className="sp-initial">{p.name.slice(0, 1)}</span>}</span>
          <b>{p.name}</b>
          <small>{p.title}</small>
        </a>
      ))}
    </nav>
  );
}
