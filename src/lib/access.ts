import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminSession } from "./admin-session";
import { db } from "./supabase";
import type { Business } from "./types";

// Private access to FiveTap Business. The link alone is not enough: each venue has two
// 6-digit codes, one for the owner (dueño/jefe) and one for the manager (gerente). Each
// phone asks for its code once and then remembers it (cookie, 180 days). The code also
// says who is using the phone: the manager does not see payments or the subscription.
// Changing a code locks every phone that used it. After 5 wrong codes the app locks for
// 15 minutes. Codes are stored encrypted so the founder (and the owner) can read them back.

export type AccessRole = "owner" | "manager";
type Keys = Pick<Business, "id" | "owner_token" | "owner_code_enc" | "manager_code_enc">;

export const CODE_RE = /^\d{6}$/;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const key = () => createHash("sha256").update(`fivetap-access-v1:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();

function encrypt(code: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(code, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function decrypt(enc: string | null): string | null {
  if (!enc) return null;
  try {
    const [iv, tag, body] = enc.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(), iv!);
    d.setAuthTag(tag!);
    return Buffer.concat([d.update(body!), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const newCode = (avoid?: string | null) => {
  let c: string;
  do c = String(randomInt(0, 1_000_000)).padStart(6, "0");
  while (c === avoid || /^(\d)\1{5}$/.test(c) || c === "123456");
  return c;
};

/** Both codes in plain digits, creating them the first time. */
export async function accessCodes(b: Keys): Promise<{ owner: string; manager: string }> {
  let owner = decrypt(b.owner_code_enc);
  let manager = decrypt(b.manager_code_enc);
  if (owner && manager) return { owner, manager };
  owner ??= newCode(manager);
  manager ??= newCode(owner);
  const patch = { owner_code_enc: encrypt(owner), manager_code_enc: encrypt(manager) };
  const { error } = await db().from("businesses").update(patch).eq("id", b.id);
  if (error) throw new Error(error.message);
  Object.assign(b, patch);
  return { owner, manager };
}

/** A new code for one role (someone left the venue). Phones that used the old one ask again. */
export async function renewCode(b: Keys, role: AccessRole) {
  const current = await accessCodes(b);
  const code = newCode(role === "owner" ? current.manager : current.owner);
  const col = role === "owner" ? "owner_code_enc" : "manager_code_enc";
  const { error } = await db().from("businesses").update({ [col]: encrypt(code), access_fails: 0, access_locked_until: null }).eq("id", b.id);
  if (error) throw new Error(error.message);
  return code;
}

const cookieName = (b: Pick<Business, "id">) => `ft_acc_${b.id.slice(0, 8)}`;
const sign = (b: Keys, role: AccessRole) =>
  createHmac("sha256", b.owner_token).update(`${role}:${role === "owner" ? b.owner_code_enc : b.manager_code_enc}`).digest("hex");

/** Who is using this phone: the owner, the manager, or nobody yet (asks for the code). */
export async function accessRole(b: Keys): Promise<AccessRole | null> {
  const jar = await cookies();
  // The founder, signed in to the panel, sees the app as the owner.
  if (await isAdminSession(jar.get(ADMIN_COOKIE)?.value)) return "owner";
  if (!b.owner_code_enc || !b.manager_code_enc) return null;
  const [role, sig] = (jar.get(cookieName(b))?.value ?? "").split(".");
  if (role !== "owner" && role !== "manager") return null;
  const want = Buffer.from(sign(b, role));
  const got = Buffer.from(sig ?? "");
  return want.length === got.length && timingSafeEqual(want, got) ? role : null;
}

async function remember(b: Keys, role: AccessRole) {
  (await cookies()).set(cookieName(b), `${role}.${sign(b, role)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/mi/${b.owner_token}`,
    maxAge: 180 * 86_400,
  });
}

export type UnlockResult = { ok: true; role: AccessRole } | { ok: false; locked: boolean; minutes?: number };

/** Checks a typed code. Wrong ones count; 5 in a row lock the app for 15 minutes. */
export async function unlock(b: Keys & Pick<Business, "access_fails" | "access_locked_until">, code: string): Promise<UnlockResult> {
  if (b.access_locked_until && Date.parse(b.access_locked_until) > Date.now()) {
    return { ok: false, locked: true, minutes: Math.ceil((Date.parse(b.access_locked_until) - Date.now()) / 60_000) };
  }
  const codes = await accessCodes(b);
  const typed = Buffer.from(code.padEnd(6).slice(0, 6));
  const role: AccessRole | null = timingSafeEqual(typed, Buffer.from(codes.owner)) ? "owner" : timingSafeEqual(typed, Buffer.from(codes.manager)) ? "manager" : null;
  if (role && CODE_RE.test(code)) {
    if (b.access_fails) await db().from("businesses").update({ access_fails: 0, access_locked_until: null }).eq("id", b.id);
    await remember(b, role);
    return { ok: true, role };
  }
  const fails = (b.access_fails ?? 0) + 1;
  const lock = fails >= MAX_FAILS;
  await db()
    .from("businesses")
    .update({ access_fails: lock ? 0 : fails, access_locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null })
    .eq("id", b.id);
  return { ok: false, locked: lock, minutes: lock ? LOCK_MINUTES : undefined };
}
