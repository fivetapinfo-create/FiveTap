"use client";

import { useEffect, useState } from "react";
import type { AvatarConfig } from "@/lib/avatar";

/** A still picture of an avatar, drawn in the browser with the shared 3D renderer. */
export function AvatarPicture({ config, logoUrl, alt }: { config: AvatarConfig; logoUrl: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const key = JSON.stringify(config);
  useEffect(() => {
    let alive = true;
    import("./avatar3d/WaiterAvatar").then(({ avatarPicture }) => avatarPicture(config, logoUrl, 220, 280)).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [key, logoUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  return url ? <img src={url} alt={alt} className="ap-img" /> : <span className="ap-wait" aria-label={alt} />;
}
