"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { AvatarConfig, AvatarMood } from "@/lib/avatar";
import { buildAvatar, buildStage, type Rig } from "./build";

type Pose = {
  hop: number; bow: number; bodyY: number;
  headX: number; headY: number; headZ: number;
  lz: number; lx: number; rz: number; rx: number; flx: number; flz: number; frx: number; frz: number;
  browUp: number; browTilt: number;
};
const REST: Pose = { hop: 0, bow: 0, bodyY: -0.16, headX: 0, headY: 0, headZ: 0, lz: 0.1, lx: 0, rz: -0.1, rx: 0, flx: -0.15, flz: 0, frx: -0.15, frz: 0, browUp: 0, browTilt: 0 };
const ease = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const bell = (p: number) => (p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI));

function poseFor(mood: AvatarMood, t: number, since: number): { pose: Pose; mouth: keyof Rig["mouths"] } {
  const p: Pose = { ...REST };
  const k = t - since; // seconds since the mood started
  // Idle life: a soft sway, breathing is applied separately.
  p.bodyY += Math.sin(t * 0.6) * 0.035;
  p.headY = Math.sin(t * 0.5) * 0.07;
  p.headZ = Math.sin(t * 0.8) * 0.03;
  let mouth: keyof Rig["mouths"] = "smile";
  if (mood === "celebrate") {
    const up = ease(k / 0.35) * (1 - ease((k - 1.9) / 0.5));
    p.lz = 0.1 + up * 2.55 + Math.sin(t * 9) * 0.12 * up;
    p.rz = -0.1 - up * 2.55 - Math.sin(t * 9 + 1) * 0.12 * up;
    p.flz = up * 0.5; p.frz = -up * 0.5;
    p.hop = k < 1.6 ? Math.abs(Math.sin(k * Math.PI * 2.4)) * 0.38 : 0;
    p.headX = -0.12 * up; p.browUp = 0.06;
    mouth = "open";
  } else if (mood === "happy") {
    const up = ease(k / 0.3) * (1 - ease((k - 2.2) / 0.45));
    p.rz = -0.1 - up * 2.35; p.frz = up * (0.35 + Math.sin(t * 11) * 0.45);
    p.headZ += up * 0.08; p.headX = Math.sin(k * 6) * 0.05 * up; p.browUp = 0.04;
    mouth = "open";
  } else if (mood === "thanks") {
    const b = bell(Math.min(1, k / 1.6));
    const hand = ease(k / 0.4);
    p.bow = 0.13 * b; p.headX = 0.22 * b;
    p.rx = -0.55 * hand; p.rz = -0.02; p.frx = -1.75 * hand; p.frz = 0.95 * hand;
    mouth = "smile";
  } else if (mood === "worried") {
    const h = ease(k / 0.5);
    p.headZ = 0.13 * h + Math.sin(t * 1.2) * 0.02; p.headX = 0.06 * h; p.headY += Math.sin(k * 2.5) * 0.04 * h;
    p.lx = -0.42 * h; p.rx = -0.42 * h; p.lz = 0.02; p.rz = -0.02; p.flx = -0.9 * h; p.frx = -0.9 * h; p.flz = -0.45 * h; p.frz = 0.45 * h;
    p.browUp = 0.05 * h; p.browTilt = 0.28 * h;
    mouth = "worried";
  } else if (mood === "neutral") {
    p.headX = 0.12 * bell(Math.min(1, k / 0.9));
    mouth = "neutral";
  }
  return { pose: p, mouth };
}

/** Load the restaurant's logo for the shirt; without one (or if it fails) the shirt stays plain. */
function loadLogo(url: string | null | undefined): Promise<THREE.Texture | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((ok) => {
    const l = new THREE.TextureLoader();
    l.setCrossOrigin("anonymous");
    l.load(url, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; ok(tx); }, undefined, () => ok(null));
  });
}

/**
 * A waiter's 3D avatar, alive: blinks, breathes, moves the head, and reacts to the guest's rating
 * (celebrates, waves, thanks, looks concerned). The speech bubble is plain text, no voice.
 */
export function WaiterAvatar({ config, logoUrl, mood = "idle", say, className, label, backdrop, floor }: { config: AvatarConfig; logoUrl?: string | null; mood?: AvatarMood; say?: string | null; className?: string; label?: string; backdrop?: string | null; floor?: [string, string] | null }) {
  const box = useRef<HTMLDivElement>(null);
  const moodRef = useRef({ mood, since: 0, talkUntil: 0 });
  const clock = useRef(0);

  useEffect(() => {
    moodRef.current = { mood, since: clock.current, talkUntil: clock.current + (say ? 1.6 : 0) };
  }, [mood, say]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let alive = true, raf = 0, visible = true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      el.classList.add("wa-fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const { scene, camera } = buildStage({ floor: floor ?? null });
    let rig: Rig | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const size = () => {
      const w = el.clientWidth || 300, h = el.clientHeight || 420;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); });
    io.observe(el);

    let nextBlink = 2, blinkUntil = 0;
    const cur: Pose = { ...REST };
    const start = performance.now();
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!visible || !rig) return;
      const t = (performance.now() - start) / 1000;
      clock.current = t;
      const m = moodRef.current;
      const { pose, mouth } = poseFor(reduced ? "idle" : m.mood, t, m.since);
      const f = reduced ? 1 : 0.16;
      (Object.keys(cur) as (keyof Pose)[]).forEach((k) => { cur[k] += (pose[k] - cur[k]) * f; });
      rig.root.position.y = cur.hop;
      rig.body.rotation.set(cur.bow, cur.bodyY, 0);
      rig.head.rotation.set(cur.headX, cur.headY, cur.headZ);
      rig.armL.rotation.set(cur.lx, 0, cur.lz); rig.armR.rotation.set(cur.rx, 0, cur.rz);
      rig.foreL.rotation.set(cur.flx, 0, cur.flz); rig.foreR.rotation.set(cur.frx, 0, cur.frz);
      rig.torso.scale.y = 1 + Math.sin(t * 2.1) * 0.012;
      rig.browL.position.y = 1.06 + cur.browUp; rig.browR.position.y = 1.06 + cur.browUp;
      rig.browL.rotation.z = 0.08 - cur.browTilt; rig.browR.rotation.z = -0.08 + cur.browTilt;
      // Blinks every few seconds.
      if (t > nextBlink) { blinkUntil = t + 0.13; nextBlink = t + 2.2 + Math.random() * 3.2; }
      const eyeY = t < blinkUntil ? 0.12 : 1;
      rig.eyes.forEach((e) => { e.scale.y += (eyeY - e.scale.y) * 0.6; });
      // Mouth: the mood's shape; while the bubble appears it "talks".
      const talking = t < m.talkUntil;
      (Object.keys(rig.mouths) as (keyof Rig["mouths"])[]).forEach((k) => { rig!.mouths[k].visible = talking ? k === (Math.floor(t * 9) % 2 ? "open" : "smile") : k === mouth; });
      renderer.render(scene, camera);
    };

    loadLogo(logoUrl).then((tx) => {
      if (!alive) { tx?.dispose(); return; }
      rig = buildAvatar(config, tx);
      scene.add(rig.root);
      frame();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      rig?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [config.body, config.skin, config.hair, config.hairColor, config.brows, logoUrl, floor?.[0], floor?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className={`wa ${backdrop ? "wa-scene " : ""}${className ?? ""}`} role="img" aria-label={label ?? "Avatar"} style={backdrop ? ({ "--wa-bg": `url("${backdrop.replace(/"/g, "")}")` } as React.CSSProperties) : undefined}>
      {say && <p key={say} className="wa-say" aria-live="polite">{say}</p>}
    </div>
  );
}

// ---------- Still pictures for lists (one shared renderer, never one per card) ----------

let shared: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null = null;
const cache = new Map<string, string>();

export async function avatarPicture(config: AvatarConfig, logoUrl: string | null, w = 240, h = 300): Promise<string | null> {
  const key = `${JSON.stringify(config)}|${logoUrl ?? ""}|${w}x${h}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    if (!shared) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const st = buildStage();
      st.camera.position.set(0, 4.85, 16.5);
      st.camera.lookAt(0, 4.6, 0);
      shared = { renderer, ...st };
    }
    const { renderer, scene, camera } = shared;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const tx = await loadLogo(logoUrl);
    const rig = buildAvatar(config, tx);
    rig.body.rotation.y = -0.16;
    (Object.keys(rig.mouths) as (keyof Rig["mouths"])[]).forEach((k) => { rig.mouths[k].visible = k === "smile"; });
    scene.add(rig.root);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL("image/png");
    scene.remove(rig.root);
    rig.dispose(); tx?.dispose();
    cache.set(key, url);
    return url;
  } catch {
    return null;
  }
}
