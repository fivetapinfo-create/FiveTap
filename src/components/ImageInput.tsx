"use client";

import { useState } from "react";

const MAX_SIDE = 1600;

/** Shrinks a photo in the browser (max 1600 px, WEBP) so uploads stay small and fast. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 700_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** File input for photos: optimizes them before the form is sent and shows how many are ready. */
export function ImageInput({ name, multiple, label, hint }: { name: string; multiple?: boolean; label: string; hint?: string }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        type="file"
        name={name}
        multiple={multiple}
        accept="image/png,image/jpeg,image/webp"
        onChange={async (e) => {
          const input = e.currentTarget;
          const files = [...(input.files ?? [])];
          if (!files.length) return setNote(null);
          setNote("Optimizando…");
          const out = await Promise.all(files.map(shrink));
          const dt = new DataTransfer();
          out.forEach((f) => dt.items.add(f));
          input.files = dt.files;
          const kb = Math.round(out.reduce((n, f) => n + f.size, 0) / 1024);
          setNote(`${out.length} ${out.length === 1 ? "foto lista" : "fotos listas"} · ${kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`}`);
        }}
      />
      <small>{note ?? hint ?? "PNG, JPG o WEBP. Se optimizan solas antes de subir."}</small>
    </label>
  );
}
