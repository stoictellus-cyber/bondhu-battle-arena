// Six procedural 3D arenas. All geometry is built in code (no external assets).
import * as THREE from 'three';
import { ARENA_R as R } from '../../server/sim.js';

const T = THREE, TAU = Math.PI * 2;
export const ARENAS = {
  rooftop: 'Neon Rooftop', underground: 'Iron Pit', electric: 'Volt Dome',
  redarena: 'Crimson Colosseum', teastall: 'Cha-er Dokan', moonroof: 'Moonlit Roof',
};
export const ARENA_IDS = Object.keys(ARENAS);

let LOW = false;
const rnd = (() => { let s = 20240; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function mat(c, o = {}) {
  if (o.basic) { const p = { color: c }; if (o.map) p.map = o.map; if (o.tr != null) { p.transparent = true; p.opacity = o.tr; } if (o.add) { p.blending = T.AdditiveBlending; p.depthWrite = false; p.transparent = true; } if (o.side) p.side = o.side; return new T.MeshBasicMaterial(p); }
  const p = { color: c };
  if (o.em != null) { p.emissive = o.em; p.emissiveIntensity = o.ei ?? 1; }
  if (o.map) p.map = o.map;
  if (o.emap) p.emissiveMap = o.emap;
  if (o.tr != null) { p.transparent = true; p.opacity = o.tr; }
  if (o.side) p.side = o.side;
  if (LOW) return new T.MeshLambertMaterial(p);
  p.roughness = o.r ?? 0.85; p.metalness = o.m ?? 0;
  return new T.MeshStandardMaterial(p);
}
function mk(geo, m, x = 0, y = 0, z = 0, parent) {
  const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !LOW; o.receiveShadow = true; parent && parent.add(o); return o;
}
const ctex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t; };

function lights(root, q, o) {
  root.add(new T.HemisphereLight(o.sky, o.gnd, o.hi));
  const d = new T.DirectionalLight(o.sun, o.si); d.position.set(...o.sp);
  if (q.shadow) {
    d.castShadow = true; d.shadow.mapSize.set(q.sm, q.sm);
    const c = d.shadow.camera; c.left = c.bottom = -14; c.right = c.top = 14; c.near = 1; c.far = 60; d.shadow.bias = -0.0006;
  }
  root.add(d);
}
function base(root, { floor, ring, rough = 0.85, ring2 }) {
  mk(new T.CylinderGeometry(R + 1.2, R + 1.4, 0.5, 56), mat(floor, { r: rough }), 0, -0.25, 0, root).castShadow = false;
  const rg = mk(new T.TorusGeometry(R, 0.08, 8, 72), mat(ring, { em: ring, ei: 2.2 }), 0, 0.02, 0, root); rg.rotation.x = Math.PI / 2; rg.castShadow = false;
  if (ring2 != null) { const r2 = mk(new T.TorusGeometry(R * 0.45, 0.04, 6, 56), mat(ring2, { em: ring2, ei: 1.6 }), 0, 0.02, 0, root); r2.rotation.x = Math.PI / 2; r2.castShadow = false; }
}
function sign(root, text, color, x, y, z, w, h, ry, font = 'bold 64px Impact, Arial Black, sans-serif') {
  const tex = ctex(512, 128, (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 24; g.fillStyle = color; g.fillText(text, cw / 2, ch / 2); g.fillText(text, cw / 2, ch / 2);
  });
  const m = mk(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, depthWrite: false }), x, y, z, root);
  m.rotation.y = ry; m.castShadow = false; return m;
}
function skyline(root, q, { n, rmin, rmax, hmin, hmax, body, win }) {
  const tex = ctex(64, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 4; y += 10) for (let x = 4; x < w - 4; x += 10) if (rnd() > 0.45) { g.fillStyle = win; g.fillRect(x, y, 5, 6); }
  });
  const m = mat(body, { em: 0xffffff, emap: tex, ei: 0.9, r: 1 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd() * 0.2, r = rmin + rnd() * (rmax - rmin), w = 3 + rnd() * 5, h = hmin + rnd() * (hmax - hmin);
    mk(new T.BoxGeometry(w, h, w), m, Math.cos(a) * r, h / 2 - 7, Math.sin(a) * r, root).castShadow = false;
  }
}
function pillarRing(root, n, rad, h, r, m) {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; mk(new T.CylinderGeometry(r, r * 1.15, h, 10), m, Math.cos(a) * rad, h / 2, Math.sin(a) * rad, root); }
}
function points(root, n, spread, y0, y1, color, size) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * spread; p[i * 3 + 1] = y0 + rnd() * (y1 - y0); p[i * 3 + 2] = (rnd() - 0.5) * spread; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
  const pts = new T.Points(g, new T.PointsMaterial({ color, size, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; root.add(pts); return pts;
}

// ---------------------------------------------------------------------------
function rooftop(root, q, A) {
  lights(root, q, { sky: 0x7a6cff, gnd: 0x1a0b2e, hi: 0.75, sun: 0xff5fd8, si: 1.1, sp: [-8, 14, 6] });
  base(root, { floor: 0x1c1c2b, ring: 0x00f0ff, ring2: 0xff2bd6 });
  skyline(root, q, { n: LOW ? 22 : 44, rmin: 24, rmax: 52, hmin: 10, hmax: 46, body: 0x0c0c1e, win: '#ffd36b' });
  const wallM = mat(0x23233a);
  for (let i = 0; i < 28; i++) { if (i % 7 === 3) continue; const a = (i / 28) * TAU; const b = mk(new T.BoxGeometry(2.2, 0.9, 0.35), wallM, Math.cos(a) * (R + 1.0), 0.45, Math.sin(a) * (R + 1.0), root); b.rotation.y = -a + Math.PI / 2; }
  sign(root, 'BONDHU', '#ff2bd6', -20, 9, -14, 11, 2.8, 0.7); sign(root, 'ARENA', '#00f0ff', 18, 11, -16, 11, 2.8, -0.7); sign(root, 'SAMI', '#ffd36b', 0, 14, -26, 9, 2.4, 0);
  for (let i = 0; i < 5; i++) { const a = 0.4 + i * 1.25; mk(new T.BoxGeometry(2.4, 1.4, 1.6), mat(0x3a3a4e, { m: 0.4 }), Math.cos(a) * 14.5, 0.7, Math.sin(a) * 14.5, root); }
  const ant = mk(new T.CylinderGeometry(0.06, 0.1, 9, 6), mat(0x555566), 15, 4.5, 8, root);
  const led = mk(new T.SphereGeometry(0.22, 8, 8), new T.MeshBasicMaterial({ color: 0xff2222 }), 15, 9.1, 8, root);
  let rain = null;
  if (!LOW) {
    const n = 220, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * 36, y = rnd() * 16, z = (rnd() - 0.5) * 36; pos.set([x, y, z, x - 0.05, y + 0.7, z], i * 6); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    rain = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.35 })); rain.frustumCulled = false; root.add(rain);
  }
  if (!LOW && q.lights) { const a = new T.PointLight(0xff2bd6, 30, 20); a.position.set(-6, 4, -6); root.add(a); const b = new T.PointLight(0x00f0ff, 30, 20); b.position.set(6, 4, 6); root.add(b); }
  A.bg = 0x0a0618; A.fog = [0x120a2a, 28, 90];
  A.update = (dt, t) => { led.visible = Math.sin(t * 5) > 0; if (rain) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - 26 * dt; if (y < 0) y += 16; p.setY(i, y); p.setY(i + 1, y + 0.7); } p.needsUpdate = true; } };
}

function underground(root, q, A) {
  lights(root, q, { sky: 0xb08a5a, gnd: 0x1a1410, hi: 0.55, sun: 0xffb347, si: 0.9, sp: [4, 16, 6] });
  base(root, { floor: 0x4a4540, ring: 0xffc400, rough: 1 });
  const hz = ctex(256, 16, (g, w, h) => { g.fillStyle = '#ffc400'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let x = -16; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 32, h); g.lineTo(x + 16, h); g.fill(); } });
  hz.repeat.set(6, 1);
  const hr = mk(new T.RingGeometry(R + 0.1, R + 0.9, 72), mat(0xffffff, { map: hz }), 0, 0.015, 0, root); hr.rotation.x = -Math.PI / 2; hr.castShadow = false;
  const wallTex = ctex(128, 128, (g, w, h) => { g.fillStyle = '#3a2e28'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e1612'; g.lineWidth = 3; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } } });
  wallTex.repeat.set(12, 2);
  mk(new T.CylinderGeometry(19, 19, 14, 40, 1, true), mat(0xffffff, { map: wallTex, side: T.BackSide }), 0, 6, 0, root).castShadow = false;
  mk(new T.CircleGeometry(19, 40), mat(0x120e0b), 0, 13, 0, root).rotation.x = Math.PI / 2;
  pillarRing(root, 8, 14.5, 13, 0.7, mat(0x6b6460, { m: 0.2 }));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; mk(new T.BoxGeometry(0.4, 0.4, 9), mat(0x7a5a2a, { m: 0.6 }), Math.cos(a) * 14.5, 11, Math.sin(a) * 14.5, root).rotation.y = -a; }
  const pipe = mat(0x8a6a3a, { m: 0.7, r: 0.5 });
  for (let k = 0; k < 3; k++) { const p = mk(new T.CylinderGeometry(0.28, 0.28, 34, 10), pipe, 0, 3 + k * 1.4, -18 + k * 0.3, root); p.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5, x = Math.cos(a) * 11, z = Math.sin(a) * 11; mk(new T.CylinderGeometry(0.02, 0.02, 4, 4), mat(0x222222), x, 11, z, root); mk(new T.ConeGeometry(0.7, 0.5, 12, 1, true), mat(0x333333, { side: T.DoubleSide }), x, 9, z, root); mk(new T.SphereGeometry(0.2, 8, 8), new T.MeshBasicMaterial({ color: 0xffd9a0 }), x, 8.85, z, root); }
  if (!LOW && q.lights) for (const a of [0.5, 3.6]) { const pl = new T.PointLight(0xffb066, 40, 24); pl.position.set(Math.cos(a) * 9, 7, Math.sin(a) * 9); root.add(pl); }
  for (let i = 0; i < 9; i++) { const a = rnd() * TAU, r = 12.5 + rnd() * 2; const s = 0.9 + rnd() * 0.8; mk(new T.BoxGeometry(s, s, s), mat(0x7b5a34), Math.cos(a) * r, s / 2, Math.sin(a) * r, root).rotation.y = rnd() * 3; }
  const fan = new T.Group(); fan.position.set(0, 6, -18.5); root.add(fan);
  for (let k = 0; k < 4; k++) { const b = mk(new T.BoxGeometry(6, 0.8, 0.1), mat(0x2a2a2a, { m: 0.5 }), 0, 0, 0, fan); b.rotation.z = (k * Math.PI) / 4; }
  const steam = LOW ? null : points(root, 60, 30, 0.2, 5, 0xbbbbbb, 0.35);
  A.bg = 0x0b0a09; A.fog = [0x1a1512, 14, 48];
  A.update = (dt, t) => { fan.rotation.z += dt * 1.6; if (steam) { const p = steam.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 0.5; if (y > 5) y = 0.2; p.setY(i, y); } p.needsUpdate = true; } };
}

function electric(root, q, A) {
  lights(root, q, { sky: 0x3a7bff, gnd: 0x050a20, hi: 0.8, sun: 0x9fd8ff, si: 1.0, sp: [3, 16, 8] });
  const grid = ctex(256, 256, (g, w, h) => { g.fillStyle = '#071030'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f6bff'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo((i * w) / 8, 0); g.lineTo((i * w) / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, (i * h) / 8); g.lineTo(w, (i * h) / 8); g.stroke(); } });
  grid.repeat.set(5, 5);
  mk(new T.CylinderGeometry(R + 1.2, R + 1.4, 0.5, 56), mat(0xffffff, { map: grid, em: 0x0a2a80, ei: 0.7, r: 0.25, m: 0.4 }), 0, -0.25, 0, root).castShadow = false;
  const rg = mk(new T.TorusGeometry(R, 0.09, 8, 72), mat(0x4cc3ff, { em: 0x4cc3ff, ei: 2.5 }), 0, 0.02, 0, root); rg.rotation.x = Math.PI / 2;
  const rg2 = mk(new T.TorusGeometry(R * 0.5, 0.05, 6, 56), mat(0x8a5cff, { em: 0x8a5cff, ei: 2 }), 0, 0.02, 0, root); rg2.rotation.x = Math.PI / 2;
  const tops = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = Math.cos(a) * 13, z = Math.sin(a) * 13;
    mk(new T.CylinderGeometry(0.5, 0.9, 1.4, 6), mat(0x16204a, { m: 0.7, r: 0.3 }), x, 0.7, z, root);
    mk(new T.CylinderGeometry(0.22, 0.4, 5, 8), mat(0x223070, { m: 0.8, r: 0.3 }), x, 3.5, z, root);
    mk(new T.SphereGeometry(0.6, 14, 12), mat(0x7fe0ff, { em: 0x4cc3ff, ei: 2.4 }), x, 6.3, z, root);
    tops.push(new T.Vector3(x, 6.3, z));
  }
  const bolts = [];
  for (let i = 0; i < 6; i++) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(12 * 3), 3));
    const l = new T.Line(g, new T.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; root.add(l); bolts.push(l);
  }
  const rings = [];
  for (let i = 0; i < 3; i++) { const r = mk(new T.TorusGeometry(15 + i * 2.5, 0.12, 6, 64), mat(0x4cc3ff, { em: 0x4cc3ff, ei: 1.5 }), 0, 4 + i * 3.2, 0, root); r.rotation.x = Math.PI / 2 + 0.2 * (i - 1); r.castShadow = false; rings.push(r); }
  for (let i = 0; i < (LOW ? 8 : 18); i++) { const a = (i / 18) * TAU * (LOW ? 2.2 : 1) , r = 20 + rnd() * 10, h = 25 + rnd() * 20; mk(new T.CylinderGeometry(0.25, 0.25, h, 6), mat(0x66d9ff, { basic: true, add: true, tr: 0.35 }), Math.cos(a) * r, h / 2 - 3, Math.sin(a) * r, root).castShadow = false; }
  if (!LOW && q.lights) { const pl = new T.PointLight(0x4cc3ff, 50, 26); pl.position.set(0, 7, 0); root.add(pl); }
  let acc = 0;
  A.bg = 0x020818; A.fog = [0x030a24, 24, 80];
  A.update = (dt, t) => {
    rings.forEach((r, i) => { r.rotation.z += dt * (0.3 + i * 0.15) * (i % 2 ? -1 : 1); });
    acc -= dt; if (acc > 0) return; acc = 0.07;
    bolts.forEach((l, i) => {
      const a = tops[i], b = tops[(i + 1) % 6], p = l.geometry.attributes.position;
      for (let k = 0; k < 12; k++) { const s = k / 11, j = k === 0 || k === 11 ? 0 : 0.7; p.setXYZ(k, a.x + (b.x - a.x) * s + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * s + Math.sin(s * Math.PI) * 1.2 + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * s + (Math.random() - 0.5) * j); }
      p.needsUpdate = true; l.visible = Math.random() > 0.15;
    });
  };
}

function redarena(root, q, A) {
  lights(root, q, { sky: 0xff5a4a, gnd: 0x2a0508, hi: 0.7, sun: 0xff6a4a, si: 1.0, sp: [-6, 15, 7] });
  base(root, { floor: 0x2a1a1c, ring: 0xff2a2a, ring2: 0xffa000, rough: 0.9 });
  const lava = mk(new T.TorusGeometry(R + 2.6, 0.7, 8, 72), mat(0xff5a00, { em: 0xff4400, ei: 1.8 }), 0, -0.4, 0, root); lava.rotation.x = Math.PI / 2; lava.castShadow = false;
  const stone = ctex(128, 128, (g, w, h) => { g.fillStyle = '#4a3434'; g.fillRect(0, 0, w, h); g.strokeStyle = '#241414'; g.lineWidth = 3; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } });
  stone.repeat.set(10, 3);
  mk(new T.CylinderGeometry(19, 19, 12, 48, 1, true), mat(0xffffff, { map: stone, side: T.BackSide, r: 1 }), 0, 5, 0, root).castShadow = false;
  const colM = mat(0x5a4040);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; mk(new T.CylinderGeometry(0.6, 0.7, 11, 10), colM, Math.cos(a) * 17.2, 5.5, Math.sin(a) * 17.2, root); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2, x = Math.cos(a) * 16.8, z = Math.sin(a) * 16.8; const b = mk(new T.PlaneGeometry(2.2, 6), mat(0xb01010, { em: 0x600000, ei: 0.6, side: T.DoubleSide }), x, 7, z, root); b.rotation.y = -a + Math.PI / 2; b.castShadow = false; mk(new T.BoxGeometry(2.4, 0.3, 0.3), mat(0x222222), x, 10.1, z, root).rotation.y = -a + Math.PI / 2; }
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, x = Math.cos(a) * 12, z = Math.sin(a) * 12;
    mk(new T.CylinderGeometry(0.2, 0.3, 2.2, 8), mat(0x2a2a2a, { m: 0.6 }), x, 1.1, z, root);
    mk(new T.CylinderGeometry(0.7, 0.35, 0.5, 10), mat(0x3a2a2a, { m: 0.6 }), x, 2.4, z, root);
    for (let k = 0; k < 2; k++) { const f = mk(new T.ConeGeometry(0.5 - k * 0.15, 1.6 + k * 0.4, 8), new T.MeshBasicMaterial({ color: k ? 0xffd040 : 0xff5a00, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }), x, 3.4 + k * 0.2, z, root); f.castShadow = false; flames.push(f); }
    if (!LOW && q.lights) { const pl = new T.PointLight(0xff6a20, 28, 18); pl.position.set(x, 4, z); root.add(pl); }
  }
  const embers = LOW ? null : points(root, 80, 34, 0, 14, 0xff8030, 0.18);
  A.bg = 0x1a0305; A.fog = [0x2a0608, 20, 60];
  A.update = (dt, t) => {
    flames.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 13 + i * 2) * 0.2, 1 + Math.sin(t * 9 + i) * 0.12); });
    lava.material.emissiveIntensity = 1.6 + Math.sin(t * 2) * 0.4;
    if (embers) { const p = embers.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 1.6; if (y > 14) y = 0; p.setY(i, y); } p.needsUpdate = true; }
  };
}

function teastall(root, q, A) {
  // Warm Bangladeshi roadside tea-stall (cha-er dokan) at dusk
  lights(root, q, { sky: 0xffc38a, gnd: 0x5a3a24, hi: 0.95, sun: 0xffa957, si: 1.2, sp: [-10, 12, 8] });
  mk(new T.CircleGeometry(70, 40), mat(0x7a5a3a, { r: 1 }), 0, -0.35, 0, root).rotation.x = -Math.PI / 2;
  base(root, { floor: 0xb08a5a, ring: 0xffb703, rough: 1 });
  const brick = ctex(128, 128, (g, w, h) => { g.fillStyle = '#9a4a32'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9c3a5'; g.lineWidth = 3; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } } });
  brick.repeat.set(3, 1);
  const brickR = ring_(root, R + 0.2);
  function ring_(r, rad) { for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; mk(new T.BoxGeometry(1.2, 0.35, 0.5), mat(0x9a4a32), Math.cos(a) * rad, 0.1, Math.sin(a) * rad, r).rotation.y = -a + Math.PI / 2; } }
  // dusk sky dome
  const sky = ctex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2d1b4e'); gr.addColorStop(0.5, '#e0627a'); gr.addColorStop(0.8, '#ffb15a'); gr.addColorStop(1, '#ffd89a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  mk(new T.SphereGeometry(80, 24, 16), new T.MeshBasicMaterial({ map: sky, side: T.BackSide, fog: false }), 0, 0, 0, root).castShadow = false;
  // the tea stall (north)
  const stall = new T.Group(); stall.position.set(0, 0, -19.5); root.add(stall);
  const tin = ctex(128, 64, (g, w, h) => { g.fillStyle = '#7d8a94'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#6a7780' : '#99a6af'; g.fillRect(x, 0, 4, h); } g.fillStyle = 'rgba(120,60,30,.35)'; g.fillRect(0, 40, w, 24); });
  const roof = mk(new T.BoxGeometry(11, 0.2, 5.5), mat(0xffffff, { map: tin, m: 0.4 }), 0, 4.4, 0, stall); roof.rotation.x = 0.18;
  for (const [x, z] of [[-5, 2], [5, 2], [-5, -2], [5, -2]]) mk(new T.CylinderGeometry(0.1, 0.12, 4.4, 8), mat(0xc8a455), x, 2.2, z, stall);
  mk(new T.BoxGeometry(10, 1.1, 1.2), mat(0x6b4a2a), 0, 0.55, 1.2, stall);
  mk(new T.BoxGeometry(10, 5, 0.3), mat(0xffffff, { map: brick }), 0, 2.5, -2.6, stall);
  const bench = mk(new T.BoxGeometry(4, 0.2, 0.9), mat(0x5a3a1c), -3.5, 0.55, 3.6, stall); mk(new T.BoxGeometry(4, 0.2, 0.9), mat(0x5a3a1c), 3.5, 0.55, 3.6, stall);
  for (const x of [-5, -2, 2, 5]) for (const s of [-1, 1]) mk(new T.BoxGeometry(0.15, 0.55, 0.15), mat(0x5a3a1c), x * 0.7 + (x < 0 ? -0.6 : 0.6), 0.27, 3.6 + s * 0.3, stall);
  // kettle on stove
  mk(new T.CylinderGeometry(0.6, 0.7, 0.6, 14), mat(0xa05a30), -2.4, 1.4, 1.2, stall);
  mk(new T.CircleGeometry(0.5, 12), mat(0xff6a1a, { em: 0xff4a00, ei: 1.5 }), -2.4, 1.71, 1.2, stall).rotation.x = -Math.PI / 2;
  mk(new T.CylinderGeometry(0.42, 0.55, 0.9, 14), mat(0xcfd4da, { m: 0.9, r: 0.25 }), -2.4, 2.1, 1.2, stall);
  mk(new T.CylinderGeometry(0.06, 0.1, 0.8, 8), mat(0xcfd4da, { m: 0.9, r: 0.25 }), -1.9, 2.3, 1.2, stall).rotation.z = -0.9;
  // jars of biscuits and cups
  for (let i = 0; i < 4; i++) { mk(new T.CylinderGeometry(0.3, 0.3, 0.6, 10), mat(0xcfe8f0, { tr: 0.45 }), 0.3 + i * 0.85, 1.4, 1.1, stall); mk(new T.CylinderGeometry(0.22, 0.22, 0.3, 10), mat(0xe0b060), 0.3 + i * 0.85, 1.25, 1.1, stall); }
  for (let i = 0; i < 6; i++) mk(new T.CylinderGeometry(0.1, 0.07, 0.16, 8), mat(0xffffff), -0.6 + i * 0.35, 1.2, 1.7, stall);
  // banana bunches hanging
  for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) { const b = mk(new T.CapsuleGeometry(0.07, 0.3, 3, 6), mat(0xf4d03f), 3 + i * 0.7 + k * 0.05, 3.6 - k * 0.04, 1.6, stall); b.rotation.z = 0.3 + k * 0.1; }
  // hanging bulbs
  for (let i = 0; i < 6; i++) { mk(new T.SphereGeometry(0.16, 8, 8), new T.MeshBasicMaterial({ color: 0xffe08a }), -4.5 + i * 1.8, 3.9, 2.6, stall); }
  sign(stall, 'চা  •  CHA', '#ffe08a', 0, 5.4, 2.9, 7, 1.7, 0, 'bold 74px "Noto Sans Bengali", Impact, sans-serif');
  sign(stall, 'BONDHU CHA STALL', '#ffd2a0', 0, 3.9, 3.05, 8, 0.9, 0, 'bold 40px Arial, sans-serif');
  if (!LOW && q.lights) { const pl = new T.PointLight(0xffc070, 45, 22); pl.position.set(0, 4, -14); root.add(pl); }
  // second shopfront (east) and rickshaw (west)
  const shop = new T.Group(); shop.position.set(19, 0, 2); shop.rotation.y = -Math.PI / 2; root.add(shop);
  mk(new T.BoxGeometry(9, 5, 4), mat(0xd8b98a), 0, 2.5, -1, shop); mk(new T.BoxGeometry(9.4, 0.3, 4.4), mat(0x6b7a85, { m: 0.4 }), 0, 5.1, -1, shop);
  mk(new T.BoxGeometry(5, 3, 0.2), mat(0x2d3b4a), 0, 1.8, 1.1, shop); sign(shop, 'MISHTI', '#ff9aa2', 0, 4.1, 1.3, 5, 1.2, 0);
  const rik = new T.Group(); rik.position.set(-16.5, 0, 8); rik.rotation.y = 1.1; root.add(rik);
  const panel = ctex(128, 64, (g, w, h) => { g.fillStyle = '#18a558'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = ['#ff3b3b', '#ffd23f', '#3b82ff', '#ff7ac8'][i % 4]; g.beginPath(); g.arc(12 + i * 15, 32 + Math.sin(i) * 12, 8, 0, TAU); g.fill(); } });
  mk(new T.BoxGeometry(1.6, 1.2, 0.1), mat(0xffffff, { map: panel }), 0, 1.7, -0.9, rik); mk(new T.BoxGeometry(1.5, 0.15, 1.6), mat(0xd62828), 0, 0.9, 0, rik);
  const hood = mk(new T.CylinderGeometry(1, 1, 1.5, 10, 1, true, 0, Math.PI), mat(0x222a52, { side: T.DoubleSide }), 0, 1.9, 0, rik); hood.rotation.set(0, 0, Math.PI / 2); hood.rotation.order = 'XYZ'; hood.rotation.x = Math.PI / 2; hood.rotation.y = 0; hood.scale.set(1, 1, 1);
  for (const [x, z, r] of [[-0.9, 0.1, 0.55], [0.9, 0.1, 0.55], [0, 1.5, 0.45]]) { const w = mk(new T.TorusGeometry(r, 0.05, 6, 20), mat(0x222222), x, r, z, rik); w.rotation.y = Math.PI / 2; }
  // palms
  for (const [x, z] of [[-14, -14], [15, -13], [-19, 2], [14, 15], [-8, 18]]) {
    const h = 6 + rnd() * 2; const t = mk(new T.CylinderGeometry(0.18, 0.28, h, 8), mat(0x7a5a38), x, h / 2, z, root); t.rotation.z = (rnd() - 0.5) * 0.15;
    for (let k = 0; k < 7; k++) { const l = mk(new T.ConeGeometry(0.35, 3.4, 4), mat(0x2f8a3a), x + Math.cos(k) * 1.2, h + 0.1, z + Math.sin(k) * 1.2, root); l.rotation.set(Math.sin(k) * 1.2, 0, -Math.cos(k) * 1.2); }
  }
  // string lights across the arena
  const bulbs = [];
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, x = Math.cos(a) * 16.5, z = Math.sin(a) * 16.5; const b = mk(new T.SphereGeometry(0.14, 6, 6), new T.MeshBasicMaterial({ color: [0xffe08a, 0xff9ab0, 0x9ae0ff][i % 3] }), x, 6.5 + Math.sin(i * 2) * 0.4, z, root); b.castShadow = false; bulbs.push(b); }
  const flies = LOW ? null : points(root, 50, 30, 0.5, 5, 0xffe9a0, 0.2);
  A.bg = 0xe0627a; A.fog = [0xf0a070, 40, 120];
  A.update = (dt, t) => { bulbs.forEach((b, i) => { b.visible = Math.sin(t * 3 + i) > -0.6; }); if (flies) { flies.rotation.y += dt * 0.05; flies.position.y = Math.sin(t) * 0.2; } };
}

function moonroof(root, q, A) {
  lights(root, q, { sky: 0x7aa0ff, gnd: 0x0a1230, hi: 0.7, sun: 0xaecbff, si: 1.2, sp: [10, 16, -8] });
  base(root, { floor: 0x2b3550, ring: 0xbcd4ff, ring2: 0x6f8cff, rough: 0.9 });
  skyline(root, q, { n: LOW ? 22 : 42, rmin: 26, rmax: 55, hmin: 8, hmax: 38, body: 0x0e1630, win: '#9ec0ff' });
  const moon = mk(new T.SphereGeometry(7, 32, 24), new T.MeshBasicMaterial({ color: 0xf4f1e0, fog: false }), 26, 28, -45, root); moon.castShadow = false;
  const halo = mk(new T.SphereGeometry(10, 24, 16), new T.MeshBasicMaterial({ color: 0xaec6ff, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false, fog: false }), 26, 28, -45, root); halo.castShadow = false;
  const sp = new Float32Array(380 * 3); for (let i = 0; i < 380; i++) { const a = rnd() * TAU, e = 0.15 + rnd() * 1.2, r = 90; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  root.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: false, fog: false })));
  for (let i = 0; i < 4; i++) { const a = 0.5 + i * 1.6; const x = Math.cos(a) * 14, z = Math.sin(a) * 14; mk(new T.CylinderGeometry(1.4, 1.4, 2.4, 14), mat(0x6a5a4a), x, 4, z, root); mk(new T.ConeGeometry(1.5, 0.8, 14), mat(0x4a3a2c), x, 5.6, z, root); for (const s of [-1, 1]) mk(new T.CylinderGeometry(0.07, 0.07, 2.8, 6), mat(0x333333), x + s * 1.0, 1.4, z, root); }
  for (let i = 0; i < 4; i++) { const a = 0.2 + i * 1.7 + 0.8; mk(new T.BoxGeometry(2.4, 1.2, 1.5), mat(0x7a808c, { m: 0.4 }), Math.cos(a) * 14.2, 0.6, Math.sin(a) * 14.2, root).rotation.y = -a; }
  const leds = []; for (let i = 0; i < 3; i++) { const x = -15 + i * 3; mk(new T.CylinderGeometry(0.05, 0.08, 8 + i * 1.5, 6), mat(0x555566), x, 4, 12, root); leds.push(mk(new T.SphereGeometry(0.2, 8, 8), new T.MeshBasicMaterial({ color: 0xff3030 }), x, 8.2 + i * 1.5, 12, root)); }
  const wall = mat(0x3a4560); for (let i = 0; i < 28; i++) { if (i % 7 === 2) continue; const a = (i / 28) * TAU; mk(new T.BoxGeometry(2.2, 0.9, 0.35), wall, Math.cos(a) * (R + 1), 0.45, Math.sin(a) * (R + 1), root).rotation.y = -a + Math.PI / 2; }
  const haze = LOW ? null : points(root, 40, 40, 0.5, 3, 0xaac4ff, 0.5);
  A.bg = 0x050a1a; A.fog = [0x0a1430, 30, 100];
  A.update = (dt, t) => { leds.forEach((l, i) => { l.visible = Math.sin(t * 2.5 + i * 1.7) > 0; }); if (haze) haze.rotation.y += dt * 0.03; };
}

const BUILDERS = { rooftop, underground, electric, redarena, teastall, moonroof };

// q = { low, shadow, sm, lights }
export function buildArena(id, q) {
  LOW = !!q.low;
  const root = new T.Group();
  const A = { root, bg: 0x000000, fog: [0x000000, 30, 90], update: null };
  BUILDERS[id](root, q, A);
  return A;
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { if (m.userData.shared) continue; ['map', 'emissiveMap'].forEach((k) => m[k] && m[k].dispose()); m.dispose(); }
  });
}
