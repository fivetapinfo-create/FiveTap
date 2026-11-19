import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HAIR_COLORS, SKINS, type AvatarConfig } from "@/lib/avatar";

// One family of low-poly waiters: faceted geometry (few segments + flat shading), the same
// proportions, the same uniform (black short-sleeve shirt, waist apron, black trousers and shoes)
// and the restaurant's logo on the chest. Only face, hair and skin change between people.

export type Rig = {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; torso: THREE.Mesh;
  armL: THREE.Group; armR: THREE.Group; foreL: THREE.Group; foreR: THREE.Group;
  eyes: THREE.Mesh[]; browL: THREE.Mesh; browR: THREE.Mesh;
  mouths: { smile: THREE.Mesh; open: THREE.Mesh; neutral: THREE.Mesh; worried: THREE.Mesh };
  logo: THREE.Mesh | null; dispose: () => void;
};

const mat = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.86, metalness: 0, ...opts });

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return `#${c.getHexString()}`;
};

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number] = [0, 0, 0], shadow = true) {
  const x = new THREE.Mesh(geo, m);
  x.position.set(...pos);
  x.castShadow = shadow;
  x.receiveShadow = false;
  return x;
}

/** Low-poly "papercraft" facets: merge the seams, then nudge each vertex a little (same result every time). */
function facet(geo: THREE.BufferGeometry, amount: number, seed: number) {
  const plain = new THREE.BufferGeometry();
  plain.setAttribute("position", geo.getAttribute("position").clone());
  if (geo.index) plain.setIndex(geo.index.clone());
  geo.dispose();
  const m = mergeVertices(plain, 1e-4);
  plain.dispose();
  const pos = m.getAttribute("position") as THREE.BufferAttribute;
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + rnd() * amount, pos.getY(i) + rnd() * amount, pos.getZ(i) + rnd() * amount);
  m.computeVertexNormals();
  return m;
}

export function buildAvatar(cfg: AvatarConfig, logo: THREE.Texture | null): Rig {
  const female = cfg.body === "f";
  const skin = SKINS[cfg.skin] ?? SKINS[1]!;
  const hairC = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[0]!;
  const seed = cfg.skin * 7 + cfg.hair * 13 + cfg.hairColor * 3 + (female ? 1 : 0);
  const M = {
    skin: mat(skin, { emissive: skin, emissiveIntensity: 0.14 }), skinDark: mat(shade(skin, -0.05), { emissive: skin, emissiveIntensity: 0.1 }),
    shirt: mat("#202024"), shirtEdge: mat("#2c2c31"), pants: mat("#151517"),
    apron: mat("#0c0c0e", { side: THREE.DoubleSide, roughness: 0.92 }), band: mat("#0a0a0b"),
    shoe: mat("#111113"), sole: mat("#2e2e31"), hair: mat(hairC, { side: THREE.DoubleSide }), hairDark: mat(shade(hairC, -0.04)),
    eye: mat("#1a1512", { roughness: 0.4 }), mouth: mat("#6a2f29"), teeth: mat("#f4efe8"),
  };
  const geos: THREE.BufferGeometry[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);
  const fg = (x: THREE.BufferGeometry, a: number, k: number) => g(facet(x, a, seed + k));

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Feet and long legs (the references' proportions: legs ≈ 45% of the height)
  for (const s of [-1, 1]) {
    body.add(mesh(g(new THREE.BoxGeometry(0.52, 0.32, 0.96)), M.shoe, [s * 0.3, 0.2, 0.14]));
    body.add(mesh(g(new THREE.BoxGeometry(0.56, 0.09, 1.0)), M.sole, [s * 0.3, 0.05, 0.14]));
    body.add(mesh(fg(new THREE.CylinderGeometry(female ? 0.25 : 0.28, female ? 0.21 : 0.24, 3.05, 7, 2), 0.02, s), M.pants, [s * 0.29, 1.84, 0]));
  }
  // Hips and the waist apron: from the waist to the knee, never over the torso
  const hipR = female ? 0.6 : 0.64;
  body.add(mesh(fg(new THREE.CylinderGeometry(hipR, hipR * 0.94, 0.5, 8), 0.02, 3), M.pants, [0, 3.38, 0]));
  const apron = mesh(g(new THREE.CylinderGeometry(hipR + 0.08, hipR + 0.2, 1.7, 9, 2, true, -Math.PI * 0.6, Math.PI * 1.2)), M.apron, [0, 2.72, 0]);
  apron.scale.z = 0.78;
  body.add(apron);
  const band = mesh(g(new THREE.CylinderGeometry(hipR + 0.1, hipR + 0.1, 0.14, 10)), M.band, [0, 3.55, 0]);
  band.scale.z = 0.8;
  body.add(band);
  body.add(mesh(g(new THREE.BoxGeometry(0.46, 0.34, 0.04)), M.band, [0.2, 3.02, (hipR + 0.13) * 0.78]));
  for (const s of [-1, 1]) {
    const tie = mesh(g(new THREE.BoxGeometry(0.09, 0.5, 0.05)), M.band, [s * 0.12, 3.25, -(hipR + 0.08) * 0.8]);
    tie.rotation.z = s * 0.28;
    body.add(tie);
  }

  // Torso: black short-sleeve shirt
  const shoulder = female ? 0.76 : 0.88;
  const torso = mesh(fg(new THREE.CylinderGeometry(shoulder, hipR * 0.96, 1.85, 8, 2), 0.035, 5), M.shirt, [0, 4.5, 0]);
  torso.scale.z = 0.62;
  body.add(torso);
  body.add(mesh(g(new THREE.BoxGeometry(0.06, 1.7, 0.02)), M.shirtEdge, [0, 4.45, shoulder * 0.6]));
  for (const s of [-1, 1]) {
    const collar = mesh(g(new THREE.ConeGeometry(0.19, 0.34, 3)), M.shirtEdge, [s * 0.16, 5.38, 0.3]);
    collar.rotation.set(Math.PI * 0.62, 0, s * 0.55);
    body.add(collar);
  }
  let logoMesh: THREE.Mesh | null = null;
  if (logo) {
    const lm = new THREE.MeshStandardMaterial({ map: logo, transparent: true, roughness: 0.7 });
    logoMesh = mesh(g(new THREE.PlaneGeometry(0.4, 0.4)), lm, [-shoulder * 0.42, 5.0, shoulder * 0.58 + 0.02], false);
    logoMesh.rotation.y = -0.3;
    body.add(logoMesh);
  }
  body.add(mesh(g(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 6)), M.skinDark, [0, 5.58, 0]));

  // Arms (pivot at the shoulder), forearm pivot at the elbow
  const arm = (s: number) => {
    const a = new THREE.Group();
    a.position.set(s * (shoulder + 0.1), 5.2, 0);
    a.add(mesh(fg(new THREE.CylinderGeometry(0.28, 0.26, 0.74, 7), 0.02, 7 + s), M.shirt, [0, -0.3, 0]));
    a.add(mesh(g(new THREE.CylinderGeometry(female ? 0.16 : 0.18, female ? 0.15 : 0.17, 0.66, 6)), M.skin, [0, -0.92, 0]));
    const fore = new THREE.Group();
    fore.position.set(0, -1.22, 0);
    fore.add(mesh(g(new THREE.CylinderGeometry(female ? 0.15 : 0.17, female ? 0.13 : 0.15, 0.95, 6)), M.skin, [0, -0.45, 0]));
    fore.add(mesh(fg(new THREE.IcosahedronGeometry(female ? 0.2 : 0.23, 0), 0.02, 9 + s), M.skin, [0, -1.02, 0.03]));
    a.add(fore);
    a.rotation.z = s * 0.1;
    body.add(a);
    return { a, fore };
  };
  const L = arm(1), R = arm(-1);

  // Head (pivot at the neck). A faceted skull that narrows into a jaw.
  const head = new THREE.Group();
  head.position.set(0, 5.74, 0);
  body.add(head);
  const skullGeo = new THREE.IcosahedronGeometry(0.78, 1);
  const sp = skullGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i);
    const k = y < -0.2 ? 1 - (Math.min(0.78, -y - 0.2) / 0.58) * (female ? 0.3 : 0.24) : 1;
    sp.setXYZ(i, sp.getX(i) * k * (female ? 0.9 : 0.93), y * 1.13, sp.getZ(i) * (0.94 + (y < 0 ? 0.04 : 0)));
  }
  const skull = mesh(fg(skullGeo, 0.025, 11), M.skin, [0, 0.82, 0]);
  head.add(skull);
  for (const s of [-1, 1]) head.add(mesh(g(new THREE.IcosahedronGeometry(0.15, 0)), M.skinDark, [s * 0.7, 0.8, -0.02]));
  const eyes = [-1, 1].map((s) => mesh(g(new THREE.BoxGeometry(0.12, female ? 0.18 : 0.16, 0.05)), M.eye, [s * 0.25, 0.86, 0.7], false));
  head.add(...eyes);
  const brow = (s: number) => {
    const b = mesh(g(new THREE.BoxGeometry(female ? 0.22 : 0.27, cfg.brows === 2 ? 0.085 : 0.06, 0.05)), M.hairDark, [s * 0.26, 1.06, 0.68], false);
    b.rotation.z = s * -0.08;
    head.add(b);
    return b;
  };
  const browL = brow(-1), browR = brow(1);
  const nose = mesh(g(new THREE.ConeGeometry(0.09, 0.24, 4)), M.skinDark, [0, 0.7, 0.76], false);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  const smile = mesh(g(new THREE.TorusGeometry(0.14, 0.033, 3, 6, Math.PI)), M.mouth, [0, 0.5, 0.64], false);
  smile.rotation.z = Math.PI;
  const open = mesh(g(new THREE.CircleGeometry(0.16, 6, Math.PI, Math.PI)), M.mouth, [0, 0.53, 0.655], false);
  open.add(mesh(g(new THREE.PlaneGeometry(0.2, 0.045)), M.teeth, [0, -0.025, 0.005], false));
  const neutral = mesh(g(new THREE.BoxGeometry(0.22, 0.04, 0.04)), M.mouth, [0, 0.47, 0.645], false);
  const worried = mesh(g(new THREE.TorusGeometry(0.12, 0.03, 3, 6, Math.PI)), M.mouth, [0, 0.4, 0.635], false);
  head.add(smile, open, neutral, worried);

  // Hair: a cap tilted back (the front stays above the brows), then each style's pieces
  const cap = (r = 0.85, phi = 0.43) => {
    const c = mesh(fg(new THREE.SphereGeometry(r, 9, 6, 0, Math.PI * 2, 0, Math.PI * phi), 0.02, 13), M.hair, [0, 0.9, -0.03]);
    c.scale.set(female ? 0.95 : 0.99, 1.14, 1.0);
    c.rotation.x = -0.32;
    head.add(c);
    return c;
  };
  const piece = (geo: THREE.BufferGeometry, p: [number, number, number], r: [number, number, number] = [0, 0, 0], k = 0, m: THREE.Material = M.hair) => {
    const x = mesh(fg(geo, 0.015, 20 + k), m, p);
    x.rotation.set(...r);
    head.add(x);
    return x;
  };
  if (!female) {
    if (cfg.hair === 0) { cap(); piece(new THREE.BoxGeometry(0.92, 0.2, 0.36), [0.04, 1.34, 0.52], [-0.62, 0, -0.1]); }
    else if (cfg.hair === 1) { cap(); piece(new THREE.BoxGeometry(0.86, 0.36, 0.6), [0.04, 1.5, 0.36], [-0.5, 0, -0.08]); piece(new THREE.BoxGeometry(0.7, 0.22, 0.5), [0.08, 1.66, 0.1], [-0.25, 0, -0.06], 2); }
    else if (cfg.hair === 2) { cap(0.84, 0.42); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; piece(new THREE.IcosahedronGeometry(0.23, 0), [Math.cos(a) * 0.52, 1.5 + Math.sin(i * 1.7) * 0.05, Math.sin(a) * 0.48 - 0.05], [i, i * 2, 0], i); } }
    else { cap(0.82, 0.4).material = M.hairDark; }
    for (const s of [-1, 1]) piece(new THREE.BoxGeometry(0.12, 0.34, 0.3), [s * 0.73, 0.98, 0.05], [0, 0, 0], 30 + s); // sideburns
  } else {
    cap(0.86, 0.45);
    piece(new THREE.BoxGeometry(0.98, 0.24, 0.34), [0.12, 1.32, 0.52], [-0.7, 0, -0.2]);
    if (cfg.hair === 0) {
      piece(new THREE.BoxGeometry(1.5, 1.95, 0.36), [0, 0.42, -0.5], [0.06, 0, 0], 3);
      for (const s of [-1, 1]) piece(new THREE.BoxGeometry(0.3, 1.6, 0.34), [s * 0.71, 0.4, 0.14], [0, 0, s * 0.05], 4 + s);
    } else if (cfg.hair === 1) {
      const bob = piece(new THREE.CylinderGeometry(0.9, 0.96, 0.85, 9, 1, true, Math.PI * 0.7, Math.PI * 1.6), [0, 0.6, -0.04], [0, 0, 0], 6);
      bob.scale.z = 0.98;
    } else if (cfg.hair === 2) {
      piece(new THREE.ConeGeometry(0.25, 1.35, 6), [0, 0.7, -0.98], [Math.PI * 0.86, 0, 0], 7);
      piece(new THREE.IcosahedronGeometry(0.19, 0), [0, 1.26, -0.82], [0, 0, 0], 8, M.hairDark);
    } else {
      piece(new THREE.IcosahedronGeometry(0.36, 0), [0, 1.78, -0.36], [0.4, 0.3, 0], 9);
    }
  }

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return {
    root, body, head, torso, armL: L.a, armR: R.a, foreL: L.fore, foreR: R.fore, eyes, browL, browR,
    mouths: { smile, open, neutral, worried }, logo: logoMesh,
    dispose: () => { geos.forEach((x) => x.dispose()); Object.values(M).forEach((m) => m.dispose()); },
  };
}

/** The stage every avatar stands on: soft daylight, a warm bounce from the floor and a soft contact shadow. */
export function buildStage() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#e9dfd3", 1.05));
  const front = new THREE.DirectionalLight("#fffaf3", 0.85);
  front.position.set(0.5, 5.5, 16);
  scene.add(front);
  const key = new THREE.DirectionalLight("#fff6ea", 1.75);
  key.position.set(4, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 9; key.shadow.camera.bottom = -2;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#dfe8ff", 0.45);
  fill.position.set(-6, 4, 3);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 4.75, 24);
  camera.lookAt(0, 4.35, 0);
  return { scene, camera };
}
