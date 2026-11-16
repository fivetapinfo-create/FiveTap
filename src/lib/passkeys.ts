import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type AuthenticatorTransportFuture, type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { ADMIN_COOKIE, ADMIN_COOKIE_DAYS, LOCK_COOKIE, UNLOCK_COOKIE, UNLOCK_MINUTES, adminSessionValue, lockCookieOptions, unlockValue } from "./admin-session";
import { db } from "./supabase";

// Founder sign-in with a passkey (Face ID, Touch ID, fingerprint or the phone's screen lock),
// using the WebAuthn standard. The private key never leaves the founder's device; FiveTap only
// keeps the public key. Each challenge is signed, single-use and expires in 5 minutes.

export type Passkey = { id: string; credential_id: string; public_key: string; counter: number; transports: string[]; device_name: string | null; rp_id: string; created_at: string; last_used_at: string | null };

const CHAL = "ft_pk_chal";
const secret = () => `fivetap-passkey-v1:${process.env.ADMIN_PASSWORD ?? ""}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
const sig = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

/** The site's identity for passkeys: its host name. A passkey only works on the domain it was made for. */
export async function relyingParty() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]!.trim();
  const rpID = host.replace(/:\d+$/, "");
  const local = rpID === "localhost";
  return { rpID, origin: `${local ? "http" : "https"}://${host}` };
}

async function saveChallenge(kind: "reg" | "auth", challenge: string) {
  const v = `${kind}.${challenge}.${Date.now()}`;
  (await cookies()).set(CHAL, `${v}.${sig(v)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
}
async function takeChallenge(kind: "reg" | "auth") {
  const jar = await cookies();
  const raw = jar.get(CHAL)?.value ?? "";
  jar.delete(CHAL); // single use
  const parts = raw.split(".");
  if (parts.length !== 4) throw new Error("La solicitud venció. Inténtalo otra vez.");
  const [k, challenge, at, s] = parts as [string, string, string, string];
  const want = Buffer.from(sig(`${k}.${challenge}.${at}`));
  const got = Buffer.from(s);
  if (k !== kind || want.length !== got.length || !timingSafeEqual(want, got) || Date.now() - Number(at) > 300_000) throw new Error("La solicitud venció. Inténtalo otra vez.");
  return challenge;
}

export async function listPasskeys(rpID?: string) {
  let q = db().from("admin_passkeys").select("*").order("created_at");
  if (rpID) q = q.eq("rp_id", rpID);
  const { data } = await q;
  return (data ?? []) as Passkey[];
}

/** Step 1 of adding this device (only while signed in to the panel). */
export async function registrationOptions() {
  const { rpID } = await relyingParty();
  const existing = await listPasskeys(rpID);
  const options = await generateRegistrationOptions({
    rpName: "FiveTap Founder",
    rpID,
    userName: "founder",
    userDisplayName: "Founder de FiveTap",
    userID: isoUint8Array.fromUTF8String("fivetap-founder"),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.credential_id, transports: p.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await saveChallenge("reg", options.challenge);
  return options;
}

/** Step 2: checks the device's answer and keeps its public key. */
export async function finishRegistration(response: RegistrationResponseJSON, deviceName: string) {
  const { rpID, origin } = await relyingParty();
  const expectedChallenge = await takeChallenge("reg");
  const v = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  if (!v.verified || !v.registrationInfo) throw new Error("No se pudo verificar la llave de acceso.");
  const c = v.registrationInfo.credential;
  const { error } = await db().from("admin_passkeys").insert({
    credential_id: c.id, public_key: isoBase64URL.fromBuffer(c.publicKey), counter: c.counter,
    transports: c.transports ?? [], device_name: deviceName.trim().slice(0, 60) || "Mi dispositivo", rp_id: rpID,
  });
  if (error) throw new Error(error.message);
  await markFaceIdDevice();
}

/** From now on this device asks for Face ID when the panel is opened after a few minutes away. */
async function markFaceIdDevice() {
  const jar = await cookies();
  jar.set(LOCK_COOKIE, "1", { ...lockCookieOptions, maxAge: ADMIN_COOKIE_DAYS * 86_400 });
  jar.set(UNLOCK_COOKIE, await unlockValue(), { ...lockCookieOptions, maxAge: UNLOCK_MINUTES * 60 });
}

/** Sign-in step 1: a challenge any of the founder's passkeys on this domain can answer. */
export async function authenticationOptions() {
  const { rpID } = await relyingParty();
  const keys = await listPasskeys(rpID);
  if (!keys.length) return null;
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: keys.map((p) => ({ id: p.credential_id, transports: p.transports as AuthenticatorTransportFuture[] })),
  });
  await saveChallenge("auth", options.challenge);
  return options;
}

/** Sign-in step 2: verifies the signature with the stored public key and opens the panel. */
export async function finishAuthentication(response: AuthenticationResponseJSON) {
  const { rpID, origin } = await relyingParty();
  const expectedChallenge = await takeChallenge("auth");
  const { data } = await db().from("admin_passkeys").select("*").eq("credential_id", response.id).eq("rp_id", rpID).maybeSingle();
  const key = data as Passkey | null;
  if (!key) throw new Error("Esta llave de acceso no está registrada en FiveTap.");
  const v = await verifyAuthenticationResponse({
    response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
    credential: { id: key.credential_id, publicKey: isoBase64URL.toBuffer(key.public_key), counter: Number(key.counter), transports: key.transports as AuthenticatorTransportFuture[] },
  });
  if (!v.verified) throw new Error("No se pudo verificar tu identidad.");
  await db().from("admin_passkeys").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", key.id);
  const main = process.env.ADMIN_PASSWORD;
  if (!main) throw new Error("Falta la configuración del panel.");
  (await cookies()).set(ADMIN_COOKIE, await adminSessionValue(main), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_COOKIE_DAYS * 86_400 });
  await markFaceIdDevice();
}

export async function passkeyOnly() {
  const { data } = await db().from("company").select("passkey_only").limit(1).maybeSingle();
  return Boolean(data?.passkey_only);
}
