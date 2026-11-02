import { randomInt } from "node:crypto";

// No 0/o, 1/l/i: codes are read aloud and typed by hand when writing tags.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function newCode(length = 7): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "negocio";
}
