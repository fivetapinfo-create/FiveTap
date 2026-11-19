import type { Metadata } from "next";
import { AvatarLab } from "./AvatarLab";

export const metadata: Metadata = { title: "Avatares — FiveTap", robots: { index: false, follow: false } };

export default function AvatarsDemo() {
  return (
    <AvatarLab
      people={[
        { name: "Mesero", config: { body: "m", skin: 2, hair: 1, hairColor: 1, brows: 1 } },
        { name: "Mesera", config: { body: "f", skin: 1, hair: 0, hairColor: 1, brows: 0 } },
      ]}
    />
  );
}
