// Procedural 3D fighters (no external assets needed). Each fighter has a distinct
// silhouette, outfit, hair/headwear, accessories, victory pose and special-move poses.
// To use real GLB models later, see public/models/README.md.
import * as THREE from 'three';
import { CHARS } from '../../server/sim.js';

const T = THREE;
const TAU = Math.PI * 2;
let LOW = false;
export const setLow = (v) => { LOW = !!v; };

const mcache = new Map(), gcache = new Map();
export function mat(color, o = {}) {
  const key = [color, o.em ?? '', o.ei ?? 0, o.r ?? 0.7, o.m ?? 0, o.map ? o.map.uuid : '', o.tr ?? 1, LOW].join('|');
  let m = mcache.get(key); if (m) return m;
  const p = { color };
  if (o.em != null) { p.emissive = o.em; p.emissiveIntensity = o.ei ?? 1; }
  if (o.map) p.map = o.map;
  if (o.tr != null && o.tr < 1) { p.transparent = true; p.opacity = o.tr; }
  if (LOW) m = new T.MeshLambertMaterial(p);
  else { p.roughness = o.r ?? 0.7; p.metalness = o.m ?? 0; m = new T.MeshStandardMaterial(p); }
  m.userData.shared = true; mcache.set(key, m); return m;
}
const G = (k, f) => { let g = gcache.get(k); if (!g) { g = f(); g.userData.shared = true; gcache.set(k, g); } return g; };
const sph = (r) => G('s' + r, () => new T.SphereGeometry(r, 14, 10));
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new T.BoxGeometry(w, h, d));
const cap = (r, l) => G(`c${r},${l}`, () => new T.CapsuleGeometry(r, l, 4, 10));
const cyl = (rt, rb, h, s = 14) => G(`y${rt},${rb},${h},${s}`, () => new T.CylinderGeometry(rt, rb, h, s));
const cone = (r, h, s = 8) => G(`n${r},${h},${s}`, () => new T.ConeGeometry(r, h, s));
const tor = (r, t) => G(`t${r},${t}`, () => new T.TorusGeometry(r, t, 6, 18));
const hemi = G('hemi', () => new T.SphereGeometry(0.255, 16, 10, 0, TAU, 0, Math.PI * 0.56));

function part(parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new T.Mesh(geo, m); o.position.set(x, y, z);
  if (sx !== 1 || sy !== 1 || sz !== 1) o.scale.set(sx, sy, sz);
  o.castShadow = true; parent.add(o); return o;
}
const piv = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };

function ctex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.userData.shared = true; return t;
}
let _lungi, _gam;
const lungiTex = () => _lungi || (_lungi = ctex(64, 64, (g, w, h) => {
  g.fillStyle = '#1e7a4a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2f2e6'; for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 3, h); g.fillRect(0, i * 16, w, 3); }
  g.fillStyle = '#0f3d27'; g.fillRect(8, 0, 2, h); g.fillRect(0, 8, w, 2);
}));
const gamTex = () => _gam || (_gam = ctex(32, 32, (g, w, h) => {
  g.fillStyle = '#d62828'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, 0, 4, h); g.fillRect(0, 0, w, 4); g.fillRect(16, 0, 2, h); g.fillRect(0, 16, w, 2);
}));

function face(head, o = {}) {
  const hy = 0.2;
  for (const s of [-1, 1]) {
    part(head, sph(0.045), mat(0xffffff), s * 0.085, hy + 0.03, 0.195);
    part(head, sph(0.026), mat(o.eye ?? 0x111111), s * 0.085, hy + 0.03, 0.228);
    const br = part(head, box(0.105, 0.022, 0.025), mat(o.brow ?? 0x111111), s * 0.085, hy + 0.095, 0.2);
    br.rotation.z = s * (o.angry ? -0.38 : 0.08);
    part(head, sph(0.04), mat(o.skin), s * 0.228, hy, 0, 0.7, 1, 1);
  }
  part(head, sph(0.032), mat(o.skinD ?? o.skin), 0, hy - 0.02, 0.228);
  const mo = part(head, box(0.095, 0.02, 0.02), mat(o.mouth ?? 0x4a1f1f), 0, hy - 0.095, 0.21);
  mo.rotation.z = o.smirk ? 0.18 : 0;
}

function hair(head, color, tilt = -0.32) {
  const h = part(head, hemi, mat(color), 0, 0.2, 0); h.rotation.x = tilt; return h;
}

// ---------------------------------------------------------------------------
// Per-fighter appearance
// ---------------------------------------------------------------------------
const LOOKS = {
  ithun: {
    skin: 0xc98a62, skinD: 0xa8704c, shirt: 0x0e1530, arm: 0x0e1530, fore: 0x0e1530, pants: 0x0a0e1c, shoes: 0x14141c, glove: 0x00e5ff,
    w: 0.92, fist: 0.88, scale: 1.02, aura: 0x00e5ff, face: { angry: false, smirk: true },
    extras(c) {
      const { rig, head, torso } = c, neon = mat(0x00e5ff, { em: 0x00e5ff, ei: 2 });
      hair(head, 0x0b0b12);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, sp = part(head, cone(0.06, 0.24), k % 2 ? neon : mat(0x0b0b12), Math.cos(a) * 0.12, 0.44, Math.sin(a) * 0.12 - 0.03);
        sp.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      }
      const hb = part(head, tor(0.238, 0.02), neon, 0, 0.28, 0); hb.rotation.x = Math.PI / 2 - 0.1;
      for (const s of [-1, 1]) {
        part(torso, box(0.04, 0.46, 0.02), neon, s * 0.13, 0.34, 0.165);
        for (const arm of [rig.sL, rig.sR]) { const r = part(arm, tor(0.083, 0.014), neon, 0, -0.2, 0); r.rotation.x = Math.PI / 2; break; }
      }
      for (const arm of [rig.sL, rig.sR]) { const r = part(arm, tor(0.083, 0.014), neon, 0, -0.2, 0); r.rotation.x = Math.PI / 2; }
      for (const k of [rig.kL, rig.kR]) part(k, box(0.15, 0.025, 0.31), neon, 0, -0.61, 0.06);
      part(rig.hips, box(0.38, 0.03, 0.26), neon, 0, 0.09, 0);
    },
  },
  sumit: {
    skin: 0x8a5a3c, skinD: 0x6e4630, shirt: 0x4b505a, arm: 0x8a5a3c, fore: 0x8a5a3c, pants: 0x5a4632, shoes: 0x1c1c1c, glove: 0x2b2b30,
    w: 1.22, fist: 1.4, scale: 1.07, aura: 0xffa31a, belly: true, face: { angry: true, brow: 0x1a1008 },
    extras(c) {
      const { rig, head, torso } = c, orange = mat(0xff7a00, { r: 0.6 }), refl = mat(0xf5f0a0, { em: 0xf5f0a0, ei: 0.6 });
      part(torso, cap(0.225, 0.3), orange, 0, 0.34, 0.01, 1.3, 1, 0.9);
      part(torso, box(0.42, 0.05, 0.02), refl, 0, 0.32, 0.2); part(torso, box(0.42, 0.05, 0.02), refl, 0, 0.5, 0.2);
      const hat = part(head, hemi, mat(0xffd21a, { r: 0.4 }), 0, 0.26, 0); hat.scale.setScalar(1.08);
      part(head, cyl(0.31, 0.31, 0.03, 20), mat(0xffd21a), 0, 0.27, 0.04);
      part(head, box(0.05, 0.04, 0.5), mat(0xe8b800), 0, 0.47, 0);
      part(head, sph(0.15), mat(0x1a1008), 0, 0.09, 0.1, 1.2, 0.8, 0.7);
      part(rig.hips, box(0.5, 0.06, 0.3), mat(0x2a1f14), 0, 0.09, 0);
      for (const k of [rig.kL, rig.kR]) part(k, box(0.18, 0.2, 0.34), mat(0x1c1c1c), 0, -0.5, 0.04);
    },
  },
  jisan: {
    skin: 0xd6a07c, skinD: 0xb78560, shirt: 0xe6edf7, arm: 0xe6edf7, fore: 0xe6edf7, pants: 0x1a2236, shoes: 0xf2f6ff, glove: 0x1a2236,
    w: 0.9, fist: 0.95, scale: 1.0, aura: 0x4cc3ff, face: { smirk: true },
    extras(c) {
      const { rig, head, torso } = c, blue = mat(0x38bdf8, { em: 0x38bdf8, ei: 2 });
      hair(head, 0x15110f, -0.2);
      part(head, box(0.3, 0.07, 0.1), mat(0x15110f), 0.06, 0.4, 0.15).rotation.z = -0.25;
      for (const s of [-1, 1]) { const g = part(head, tor(0.068, 0.011), mat(0x111111), s * 0.085, 0.23, 0.205); g.scale.set(1, 0.85, 1); }
      part(head, box(0.05, 0.01, 0.01), mat(0x111111), 0, 0.235, 0.215);
      part(torso, box(0.03, 0.46, 0.02), blue, -0.1, 0.34, 0.17); part(torso, box(0.03, 0.46, 0.02), blue, 0.1, 0.34, 0.17);
      part(torso, box(0.3, 0.025, 0.02), blue, 0, 0.5, 0.17);
      for (const f of [rig.eL, rig.eR]) { const r = part(f, tor(0.075, 0.014), blue, 0, -0.3, 0); r.rotation.x = Math.PI / 2; }
      for (const fi of [rig.fL, rig.fR]) part(fi, sph(0.045), blue, 0, 0.0, 0.07);
    },
  },
  jihad: {
    skin: 0xb5724b, skinD: 0x92583a, shirt: 0xb91c1c, arm: 0xb5724b, fore: 0xb5724b, pants: 0x16161a, shoes: 0x7f1d1d, glove: 0xf2f2f2,
    w: 1.1, fist: 1.12, scale: 1.04, aura: 0xff3b3b, face: { angry: true, brow: 0x110808 },
    extras(c) {
      const { rig, head, torso } = c, red = mat(0xff2d2d, { em: 0xff2d2d, ei: 1.4 });
      for (let k = 0; k < 7; k++) { const sp = part(head, box(0.05, 0.14 + (k % 2) * 0.03, 0.09), red, 0, 0.42 - Math.abs(k - 3) * 0.02, -0.14 + k * 0.045); sp.rotation.x = -0.15 + k * 0.05; }
      part(head, sph(0.24), mat(0x110808), 0, 0.2, -0.03, 1, 0.95, 0.9);
      const hb = part(head, tor(0.236, 0.022), mat(0x111111), 0, 0.3, 0); hb.rotation.x = Math.PI / 2 - 0.1;
      part(head, box(0.012, 0.09, 0.012), mat(0x5a0f0f), 0.12, 0.2, 0.18).rotation.z = 0.5;
      for (const s of [-1, 1]) { part(rig.lL, box(0.03, 0.4, 0.14), red, s * 0.0 + 0.1, -0.25, 0); part(rig.lR, box(0.03, 0.4, 0.14), red, -0.1, -0.25, 0); break; }
      part(torso, box(0.46, 0.04, 0.02), mat(0x111111), 0, 0.12, 0.17);
    },
  },
  nihal: {
    skin: 0xa86a44, skinD: 0x8a5436, shirt: 0xf1c232, arm: 0xf1c232, fore: 0xa86a44, pants: 0x1f6f43, shoes: 0x2563eb, glove: 0xa86a44,
    w: 1.06, fist: 0.95, scale: 1.0, aura: 0xffd23f, belly: true, face: { smirk: true },
    extras(c) {
      const { rig, head, torso, hips } = c;
      // lungi (checked wraparound skirt)
      part(hips, cyl(0.28, 0.4, 0.62, 18), mat(0xffffff, { map: lungiTex(), r: 0.9 }), 0, -0.28, 0);
      // gamchha scarf
      const sc = part(torso, box(0.13, 0.62, 0.04), mat(0xffffff, { map: gamTex(), r: 0.9 }), -0.1, 0.38, 0.2); sc.rotation.z = -0.55;
      part(torso, tor(0.14, 0.04), mat(0xffffff, { map: gamTex(), r: 0.9 }), 0, 0.7, 0).rotation.x = Math.PI / 2;
      // curly hair
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; part(head, sph(0.075), mat(0x1a0f08), Math.cos(a) * 0.15, 0.4 + (k % 2) * 0.02, Math.sin(a) * 0.14 - 0.03); }
      part(head, sph(0.1), mat(0x1a0f08), 0, 0.44, -0.02); part(head, sph(0.1), mat(0x1a0f08), 0.06, 0.45, 0.07);
      // moustache
      for (const s of [-1, 1]) part(head, sph(0.05), mat(0x1a0f08), s * 0.05, 0.135, 0.222, 1.6, 0.5, 0.6);
      part(head, sph(0.03), mat(0xffd700, { r: 0.3, m: 0.8 }), 0.2, 0.17, 0.05);
    },
  },
  rifat: {
    skin: 0xe2b08a, skinD: 0xc8956f, shirt: 0x15151c, arm: 0x15151c, fore: 0x15151c, pants: 0x3b3f46, shoes: 0xf1f5f9, glove: 0xe2b08a,
    w: 0.86, fist: 0.9, scale: 0.99, aura: 0xb8c8ff, face: { smirk: true, eye: 0x223355 },
    extras(c) {
      const { rig, head, torso } = c, glow = mat(0xbcd4ff, { em: 0xbcd4ff, ei: 1.8 });
      part(head, sph(0.27), mat(0x15151c), 0, 0.14, -0.14, 1, 0.9, 0.7);
      hair(head, 0xcfd8e3, -0.45);
      part(head, box(0.28, 0.06, 0.07), mat(0xcfd8e3), 0.03, 0.4, 0.17).rotation.z = 0.2;
      part(head, box(0.22, 0.12, 0.1), mat(0xe5e7eb, { r: 0.9 }), 0, 0.085, 0.165);
      part(torso, tor(0.15, 0.045), mat(0xe5e7eb), 0, 0.7, 0).rotation.x = Math.PI / 2;
      part(torso, box(0.04, 0.42, 0.02), glow, -0.1, 0.34, 0.17); part(torso, box(0.04, 0.42, 0.02), glow, 0.1, 0.34, 0.17);
      part(torso, box(0.22, 0.03, 0.02), glow, 0, 0.18, 0.17);
      for (const k of [rig.kL, rig.kR]) part(k, box(0.15, 0.025, 0.31), glow, 0, -0.61, 0.06);
    },
  },
};

export const makeCup = () => {
  const g = new T.Group();
  part(g, cyl(0.11, 0.075, 0.16, 12), mat(0xf5f5f0, { r: 0.4 }), 0, 0, 0);
  part(g, cyl(0.1, 0.1, 0.02, 12), mat(0xc2621a, { em: 0xc2621a, ei: 0.6 }), 0, 0.07, 0);
  const h = part(g, tor(0.05, 0.015), mat(0xf5f5f0), 0.12, 0, 0);
  g.scale.setScalar(1.8);
  return g;
};

const BASE = {
  cr: 0, lean: 0, roll: 0, lift: 0, tY: -0.35, tX: 0.08, tZ: 0, hX: 0, hY: 0,
  sLx: -0.95, sLz: 0.12, eLx: -1.7, sRx: -0.75, sRz: -0.12, eRx: -1.9,
  lLx: -0.35, lLz: 0.05, kLx: 0.35, lRx: 0.3, lRz: -0.05, kRx: 0.5,
};
const lerp = (a, b, t) => a + (b - a) * t;

export function buildFighter(id) {
  const L = LOOKS[id];
  const root = new T.Group();
  const body = piv(root);
  const w = L.w;
  const hips = piv(body, 0, 1.02);
  part(hips, box(0.36 * w, 0.2, 0.24), mat(L.pants), 0, 0, 0);
  const torso = piv(hips, 0, 0.08);
  part(torso, cap(0.2, 0.3), mat(L.shirt), 0, 0.34, 0, w * 1.15, 1, 0.8);
  if (L.belly) part(torso, sph(0.2), mat(L.shirt), 0, 0.18, 0.06, 1.15, 1, 0.9);
  part(torso, cyl(0.07, 0.08, 0.12), mat(L.skin), 0, 0.72, 0);
  const head = piv(torso, 0, 0.76);
  part(head, sph(0.23), mat(L.skin), 0, 0.2, 0, 1, 1.06, 1);
  face(head, { skin: L.skin, skinD: L.skinD, ...(L.face || {}) });

  const mkArm = (s) => {
    const sh = piv(torso, s * (0.27 * w + 0.12), 0.6);
    part(sh, sph(0.1), mat(L.arm));
    part(sh, cap(0.075, 0.2), mat(L.arm), 0, -0.17, 0);
    const el = piv(sh, 0, -0.34);
    part(el, cap(0.065, 0.18), mat(L.fore), 0, -0.16, 0);
    const fist = part(el, sph(0.095 * L.fist), mat(L.glove), 0, -0.34, 0);
    return { sh, el, fist };
  };
  const mkLeg = (s) => {
    const hp = piv(hips, s * 0.14, -0.04);
    part(hp, cap(0.095, 0.28), mat(L.pants), 0, -0.25, 0);
    const kn = piv(hp, 0, -0.5);
    part(kn, cap(0.078, 0.28), mat(L.legLow ?? L.pants), 0, -0.25, 0);
    part(kn, box(0.14, 0.09, 0.3), mat(L.shoes, { r: 0.5 }), 0, -0.56, 0.06);
    return { hp, kn };
  };
  const A = mkArm(1), B = mkArm(-1), LA = mkLeg(1), LB = mkLeg(-1);
  const rig = { hips, torso, head, sL: A.sh, eL: A.el, fL: A.fist, sR: B.sh, eR: B.el, fR: B.fist, lL: LA.hp, kL: LA.kn, lR: LB.hp, kR: LB.kn };
  L.extras({ rig, head, torso, hips, body, root });

  const blob = new T.Mesh(new T.CircleGeometry(0.65, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; root.add(blob);
  const aura = new T.Mesh(new T.CylinderGeometry(0.85, 0.7, 2.3, 18, 1, true),
    new T.MeshBasicMaterial({ color: L.aura, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  aura.position.y = 1.15; aura.visible = false; root.add(aura);
  root.scale.setScalar(0.84 * (L.scale || 1));
  return { id, root, body, rig, aura, color: L.aura, cur: { ...BASE }, ph: Math.random() * 6 };
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
function targetPose(F, f, time) {
  const p = { ...BASE };
  const id = f.id, t = f.t, s = f.st;
  p.cr = -0.06 + Math.sin(time * 5 + F.ph) * 0.02;
  switch (s) {
    case 'idle': p.sLx += Math.sin(time * 5 + F.ph) * 0.05; break;
    case 'run': {
      const sw = Math.sin(time * 12 + F.ph);
      p.lLx = -0.3 + sw * 0.7; p.lRx = 0.3 - sw * 0.7;
      p.kLx = 0.4 + Math.max(0, sw) * 0.8; p.kRx = 0.4 + Math.max(0, -sw) * 0.8;
      p.cr = -0.09 + Math.abs(sw) * 0.04; break;
    }
    case 'block': Object.assign(p, { sLx: -1.35, sLz: -0.35, eLx: -2.3, sRx: -1.35, sRz: 0.35, eRx: -2.3, cr: -0.12, tX: 0.2, hX: 0.2, tY: 0 }); break;
    case 'jump': Object.assign(p, { lLx: -0.9, kLx: 1.3, lRx: -0.5, kRx: 1.0, sLx: -2.2, sRx: -2.2, sLz: 0.4, sRz: -0.4, eLx: -0.4, eRx: -0.4, cr: 0 }); break;
    case 'dodge': {
      const k = Math.min(1, t / 0.12);
      Object.assign(p, { cr: -0.3 * k, lean: 0.35 * k, roll: 0.25 * k, sLx: 0.3, sRx: 0.3, eLx: -0.6, eRx: -0.6, lLx: -0.8, kLx: 1.0, lRx: 0.6, kRx: 0.8 });
      break;
    }
    case 'hit': {
      const air = f.y > 0.15;
      Object.assign(p, { tX: -0.45, hX: -0.35, sLx: -0.3, sRx: -0.3, eLx: -0.5, eRx: -0.5, lean: air ? -0.9 : -0.18, cr: -0.1 });
      break;
    }
    case 'punch': {
      const h = f.hA / f.dur, ph = t / f.dur;
      const e = ph < h ? ph / h : Math.max(0, 1 - (ph - h) / (1 - h));
      if (f.cb === 1) { p.sLx = lerp(-0.95, -1.57, e); p.eLx = lerp(-1.7, -0.1, e); p.sLz = 0.02; p.tY = lerp(-0.35, -0.95, e); }
      else { p.sRx = lerp(-0.75, -1.57, e); p.eRx = lerp(-1.9, -0.1, e); p.sRz = -0.02; p.tY = lerp(-0.35, f.cb === 2 ? 0.9 : 0.6, e); }
      if (f.cb === 2) { p.lean = 0.12 * e; p.cr = -0.12 * e; p.lLx = -0.7 * e - 0.35; }
      break;
    }
    case 'kick': {
      const h = f.hA / f.dur, ph = t / f.dur;
      const e = ph < h ? ph / h : Math.max(0, 1 - (ph - h) / (1 - h));
      p.lRx = lerp(0.3, -1.55, e); p.kRx = lerp(0.5, 0.1, e); p.tX = lerp(0.08, -0.3, e); p.lean = -0.12 * e;
      p.sLx = -1.3; p.sRx = -1.1; p.lLx = -0.35 - 0.2 * e; p.kLx = 0.5; break;
    }
    case 'special': {
      const sp = CHARS[id].sp, ph = t / f.dur;
      switch (sp.type) {
        case 'dash':
          if (t < sp.s) Object.assign(p, { cr: -0.28, lean: 0.2, sLx: 0.6, sRx: 0.9, eLx: -0.4, eRx: -0.4, lLx: -0.8, lRx: 0.7, kLx: 0.9, kRx: 0.9, tY: -0.6 });
          else if (t < sp.s + sp.dd) Object.assign(p, { lean: 0.75, cr: -0.2, sLx: 1.2, sRx: 1.2, eLx: -0.1, eRx: -0.1, lLx: -1.0, lRx: 0.9, kLx: 0.3, kRx: 0.2, tX: 0.3, hX: -0.5 });
          else Object.assign(p, { sRx: -1.57, eRx: -0.1, tY: 0.7, lean: 0.1, cr: -0.15 });
          break;
        case 'aoe':
          if (t < sp.h) { const k = Math.min(1, t / (sp.h * 0.9)); p.sLx = lerp(-0.95, -3.0, k); p.sRx = lerp(-0.75, -3.0, k); p.eLx = p.eRx = -0.2; p.lean = -0.25 * k; p.hX = -0.3 * k; p.tY = 0; }
          else Object.assign(p, { sLx: -0.3, sRx: -0.3, eLx: -0.2, eRx: -0.2, cr: -0.32, tX: 0.5, lLx: -0.9, lRx: -0.9, kLx: 1.0, kRx: 1.0, hX: 0.3, tY: 0 });
          break;
        case 'multi': {
          const k = Math.floor(t / 0.2) % 2, e = Math.abs(Math.sin((t / 0.2) * Math.PI));
          if (k) { p.sLx = -0.95 - 0.65 * e; p.eLx = -1.7 + 1.6 * e; p.tY = -0.7; }
          else { p.sRx = -0.75 - 0.8 * e; p.eRx = -1.9 + 1.8 * e; p.tY = 0.6; }
          p.cr = -0.1; break;
        }
        case 'burst': {
          const k = Math.min(1, t / sp.h);
          if (t < sp.h) Object.assign(p, { sLz: 1.5 * k, sRz: -1.5 * k, sLx: -0.3, sRx: -0.3, eLx: -0.3, eRx: -0.3, hX: -0.5 * k, tX: -0.25 * k, cr: -0.05 - 0.1 * k, tY: 0 });
          else Object.assign(p, { sLx: -0.1, sRx: -0.1, sLz: 0.6, sRz: -0.6, eLx: -0.4, eRx: -0.4, cr: -0.3, tX: 0.5, hX: 0.4, tY: 0 });
          break;
        }
        case 'ranged':
          if (t < sp.h) { const k = t / sp.h; p.sRx = lerp(-0.75, 1.4, k); p.eRx = -0.5; p.tY = lerp(-0.35, -0.9, k); p.lean = -0.1 * k; }
          else { p.sRx = -1.57; p.eRx = -0.1; p.tY = 0.9; p.lean = 0.12; p.cr = -0.12; }
          break;
        case 'teleport':
          if (t < 0.12) Object.assign(p, { cr: -0.3, lean: 0.1, sLx: 0.4, sRx: 0.4, eLx: -0.5, eRx: -0.5 });
          else { p.lRx = -1.55; p.kRx = 0.1; p.tX = -0.3; p.lean = 0.2 - 0.3 * Math.min(1, (t - 0.12) / 0.3); p.sLx = -1.3; p.sRx = -1.1; p.lift = 0.15 * Math.sin(Math.min(1, (t - 0.12) / 0.7) * Math.PI); }
          break;
      }
      break;
    }
    case 'ko': {
      const k = Math.min(1, t * 2.2);
      Object.assign(p, { lean: -1.5 * k, lift: 0.22 * k, sLz: 0.7, sRz: -0.7, sLx: -0.1, sRx: -0.1, eLx: -0.3, eRx: -0.3, lLx: -0.1, lRx: 0.1, kLx: 0.1, kRx: 0.2, tX: 0, tY: 0, hX: 0, cr: 0 });
      break;
    }
    case 'lose': Object.assign(p, { tX: 0.5, hX: 0.6, sLx: 0, sRx: 0, eLx: -0.2, eRx: -0.2, sLz: 0.1, sRz: -0.1, cr: -0.12, tY: 0, lLx: -0.1, lRx: 0.1 }); break;
    case 'win': {
      const w = Math.sin(time * 4), j = Math.max(0, Math.sin(time * 5));
      switch (id) {
        case 'ithun': Object.assign(p, { sRx: -3.0, sRz: -0.2, eRx: -0.2, sLx: -0.4, sLz: 0.5, eLx: -1.8, tY: 0, hX: -0.2, lift: j * 0.25 }); break;
        case 'sumit': Object.assign(p, { sLz: 1.3, sRz: -1.3, sLx: -0.3, sRx: -0.3, eLx: -2.4, eRx: -2.4, tY: 0, tX: -0.1, cr: -0.05 + w * 0.03 }); break;
        case 'jisan': Object.assign(p, { sLx: -1.25, sLz: -0.1, eLx: -2.4, sRx: -0.9, sRz: -0.4, eRx: -1.9, tY: 0.1, hX: -0.1, hY: 0.2 }); break;
        case 'jihad': Object.assign(p, { sLz: 0.9, sRz: -0.9, sLx: -0.2, sRx: -0.2, eLx: -0.6, eRx: -0.6, hX: -0.6, tX: -0.2, tY: 0, cr: -0.15 + w * 0.02, tZ: Math.sin(time * 28) * 0.05 }); break;
        case 'nihal': Object.assign(p, { sRx: -2.9 + w * 0.3, sRz: -0.3, eRx: -0.4, sLx: -0.5, sLz: 0.6, eLx: -0.8 + w * 0.4, tZ: w * 0.18, tY: 0, lift: j * 0.12, hY: w * 0.2 }); break;
        case 'rifat': Object.assign(p, { sLx: -1.2, sLz: -0.8, eLx: -2.3, sRx: -1.2, sRz: 0.8, eRx: -2.3, hY: 0.35, tY: 0, hX: 0.05 }); break;
      }
      break;
    }
  }
  return p;
}

export function poseFighter(F, f, dt, time) {
  const p = targetPose(F, f, time);
  const fast = f.st === 'punch' || f.st === 'kick' || f.st === 'special' || f.st === 'hit' || f.st === 'dodge';
  const k = 1 - Math.exp(-(fast ? 34 : 16) * dt);
  const c = F.cur;
  for (const key in p) c[key] += (p[key] - c[key]) * k;
  const r = F.rig;
  r.hips.position.y = 1.02 + c.cr;
  F.body.rotation.set(c.lean, 0, c.roll);
  F.body.position.y = c.lift;
  r.torso.rotation.set(c.tX, c.tY, c.tZ);
  r.head.rotation.set(c.hX, c.hY, 0);
  r.sL.rotation.set(c.sLx, 0, c.sLz); r.eL.rotation.x = c.eLx;
  r.sR.rotation.set(c.sRx, 0, c.sRz); r.eR.rotation.x = c.eRx;
  r.lL.rotation.set(c.lLx, 0, c.lLz); r.kL.rotation.x = c.kLx;
  r.lR.rotation.set(c.lRx, 0, c.lRz); r.kR.rotation.x = c.kRx;
  if (f.st === 'dodge' && (f.id === 'ithun' || f.id === 'rifat')) F.body.rotation.y = (f.t / 0.4) * TAU * 1.0; else F.body.rotation.y = 0;
  F.body.visible = !(f.id === 'rifat' && f.st === 'special' && f.t > 0.03 && f.t < 0.13);
  const auraOn = f.st === 'special' || f.bf;
  F.aura.visible = !!auraOn;
  if (auraOn) { F.aura.material.opacity = 0.18 + 0.1 * Math.sin(time * 18); F.aura.rotation.y += dt * 3; }
}
