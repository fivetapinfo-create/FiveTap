import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
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
type Keys = Pick<Business, "id" | "owner_token" | "owner_code_enc" | "manager_code_enc"> & { password_required?: boolean; password_epoch?: number };

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
// With username and password required (empresas), the phone's pass is tied to the password
// session instead of the code: a code alone no longer opens the app.
const sign = (b: Keys, role: AccessRole) =>
  b.password_required
    ? createHmac("sha256", b.owner_token).update(`pw:${role}:${b.password_epoch ?? 0}`).digest("hex")
    : createHmac("sha256", b.owner_token).update(`${role}:${role === "owner" ? b.owner_code_enc : b.manager_code_enc}`).digest("hex");

/** Who is using this phone: the owner, the manager, or nobody yet (asks for the code). */
/** True when the founder, signed in to the panel, is looking at a business's app as its owner. */
export async function founderView() {
  return isAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

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
  // Businesses that require username and password never open with a code.
  if (b.password_required) return { ok: false, locked: false };
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


// ---------- Username and password (empresas) ----------

const scryptAsync = (pw: string, salt: Buffer) => new Promise<Buffer>((ok, ko) => scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? ko(e) : ok(k))));

/** One-way hash: nobody, not even the founder, can read a password back. */
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${(await scryptAsync(pw, salt)).toString("base64url")}`;
}
async function checkPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const got = await scryptAsync(pw, Buffer.from(salt, "base64url"));
  const want = Buffer.from(hash, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}
export const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
export function passwordProblem(pw: string) {
  if (pw.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Usa letras y números en la contraseña.";
  return null;
}

/** Founder: creates (or resets) a person's username and password for a business. */
export async function setBusinessUser(businessId: string, role: AccessRole, username: string, password: string) {
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) throw new Error("Usuario: de 3 a 40 letras minúsculas, números, punto, guion o guion bajo.");
  const bad = passwordProblem(password);
  if (bad) throw new Error(bad);
  const password_hash = await hashPassword(password);
  const { data: taken } = await db().from("business_users").select("id, business_id").eq("username", u).maybeSingle();
  if (taken && taken.business_id !== businessId) throw new Error("Ese usuario ya existe en otro negocio. Elige otro.");
  const { error } = taken
    ? await db().from("business_users").update({ role, password_hash, failed: 0, locked_until: null }).eq("id", taken.id)
    : await db().from("business_users").insert({ business_id: businessId, role, username: u, password_hash });
  if (error) throw new Error(error.message);
}

export type PasswordLogin = { ok: true; role: AccessRole } | { ok: false; locked: boolean };

/** Checks username and password for this business only. 5 wrong in a row lock that user 15 minutes. */
export async function loginWithPassword(b: Keys, username: string, password: string): Promise<PasswordLogin> {
  const u = username.trim().toLowerCase();
  const { data: user } = await db().from("business_users").select("*").eq("business_id", b.id).eq("username", u).maybeSingle();
  if (!user) { await checkPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"); return { ok: false, locked: false }; }
  if (user.locked_until && Date.parse(user.locked_until) > Date.now()) return { ok: false, locked: true };
  if (await checkPassword(password, user.password_hash)) {
    await db().from("business_users").update({ failed: 0, locked_until: null, last_login_at: new Date().toISOString() }).eq("id", user.id);
    await remember(b, user.role as AccessRole);
    return { ok: true, role: user.role as AccessRole };
  }
  const failed = (user.failed ?? 0) + 1;
  const lock = failed >= MAX_FAILS;
  await db().from("business_users").update({ failed: lock ? 0 : failed, locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null }).eq("id", user.id);
  return { ok: false, locked: lock };
}
