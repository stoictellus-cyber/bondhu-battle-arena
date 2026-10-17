// Lightweight particle / ring / bolt / projectile effects.
import * as THREE from 'three';
const T = THREE;

export class FX {
  constructor(scene, max = 300) {
    this.N = max; this.i = 0;
    this.pos = new Float32Array(max * 3).fill(-999);
    this.col = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.ml = new Float32Array(max).fill(1);
    this.grav = new Float32Array(max);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new T.BufferAttribute(this.col, 3));
    this.pts = new T.Points(g, new T.PointsMaterial({ size: 0.26, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.pts.frustumCulled = false;
    scene.add(this.pts);
    this.scene = scene;
    this.rings = []; this.orbs = []; this.bolts = []; this.props = [];
    const rg = new T.RingGeometry(0.85, 1, 40);
    for (let k = 0; k < 6; k++) {
      const m = new T.Mesh(rg, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.userData = { t: 0, d: 1, r: 1 }; scene.add(m); this.rings.push(m);
    }
    const og = new T.SphereGeometry(1, 16, 12);
    for (let k = 0; k < 3; k++) {
      const m = new T.Mesh(og, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      m.visible = false; m.userData = { t: 0, d: 1, r: 1 }; scene.add(m); this.orbs.push(m);
    }
    for (let k = 0; k < 10; k++) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(10 * 3), 3));
      const l = new T.Line(geo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      l.visible = false; l.frustumCulled = false; l.userData = { t: 0, d: 0, a: new T.Vector3(), b: new T.Vector3() }; scene.add(l); this.bolts.push(l);
    }
    this._c = new T.Color();
  }

  emit(x, y, z, color, n = 10, speed = 4, life = 0.5, grav = -6, up = 0.5) {
    this._c.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.N;
      const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1 + up, s = speed * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * s * (1 - Math.abs(e) * 0.3); this.vel[i * 3 + 1] = e * s; this.vel[i * 3 + 2] = Math.sin(a) * s * (1 - Math.abs(e) * 0.3);
      this.base[i * 3] = this._c.r; this.base[i * 3 + 1] = this._c.g; this.base[i * 3 + 2] = this._c.b;
      this.life[i] = this.ml[i] = life * (0.6 + Math.random() * 0.4); this.grav[i] = grav;
    }
  }
  ring(x, z, color, r = 3, d = 0.5, y = 0.06) {
    const m = this.rings.find((q) => !q.visible) || this.rings[0];
    m.material.color.set(color); m.position.set(x, y, z); m.userData = { t: 0, d, r }; m.visible = true;
  }
  orb(x, y, z, color, r = 2.5, d = 0.4) {
    const m = this.orbs.find((q) => !q.visible) || this.orbs[0];
    m.material.color.set(color); m.position.set(x, y, z); m.userData = { t: 0, d, r }; m.visible = true;
  }
  bolt(ax, ay, az, bx, by, bz, color = 0x66ccff, d = 0.18) {
    const l = this.bolts.find((q) => !q.visible) || this.bolts[0];
    l.material.color.set(color); l.userData.a.set(ax, ay, az); l.userData.b.set(bx, by, bz); l.userData.t = d; l.userData.d = d; l.visible = true;
  }
  prop(mesh, x, y, z, vx, vz, life, spin = 12, onEnd) {
    mesh.position.set(x, y, z); this.scene.add(mesh); this.props.push({ mesh, vx, vz, life, spin, onEnd });
  }

  update(dt) {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) { if (this.pos[i * 3 + 1] > -900) { this.pos[i * 3 + 1] = -999; this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; } continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02 && this.grav[i] < 0) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; }
      const f = Math.max(0, this.life[i] / this.ml[i]);
      this.col[i * 3] = this.base[i * 3] * f; this.col[i * 3 + 1] = this.base[i * 3 + 1] * f; this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
    this.pts.geometry.attributes.color.needsUpdate = true;
    for (const m of this.rings) if (m.visible) {
      const u = m.userData; u.t += dt; const k = u.t / u.d;
      if (k >= 1) { m.visible = false; continue; }
      m.scale.setScalar(Math.max(0.01, u.r * (1 - Math.pow(1 - k, 2)))); m.material.opacity = 0.9 * (1 - k);
    }
    for (const m of this.orbs) if (m.visible) {
      const u = m.userData; u.t += dt; const k = u.t / u.d;
      if (k >= 1) { m.visible = false; continue; }
      m.scale.setScalar(Math.max(0.01, u.r * Math.sqrt(k))); m.material.opacity = 0.55 * (1 - k);
    }
    for (const l of this.bolts) if (l.visible) {
      const u = l.userData; u.t -= dt;
      if (u.t <= 0) { l.visible = false; continue; }
      const p = l.geometry.attributes.position, n = 10;
      for (let k = 0; k < n; k++) {
        const s = k / (n - 1), j = k === 0 || k === n - 1 ? 0 : 0.28;
        p.setXYZ(k, u.a.x + (u.b.x - u.a.x) * s + (Math.random() - 0.5) * j, u.a.y + (u.b.y - u.a.y) * s + (Math.random() - 0.5) * j, u.a.z + (u.b.z - u.a.z) * s + (Math.random() - 0.5) * j);
      }
      p.needsUpdate = true; l.material.opacity = u.t / u.d;
    }
    for (let k = this.props.length - 1; k >= 0; k--) {
      const p = this.props[k]; p.life -= dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.z += p.vz * dt; p.mesh.rotation.y += p.spin * dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.props.splice(k, 1); p.onEnd && p.onEnd(p.mesh.position); }
    }
  }
}
