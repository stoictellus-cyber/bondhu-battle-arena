// Touch (virtual joystick + buttons) and keyboard controls.
export class Controls {
  constructor() {
    this.sx = 0; this.sy = 0; this.block = false; this.q = []; this.keys = new Set();
    this.root = document.getElementById('touch');
    this.joy = document.getElementById('joy');
    this.base = document.getElementById('joyBase'); this.knob = document.getElementById('joyKnob');
    this.pid = null; this.ox = 0; this.oy = 0; this.RAD = 52; this.held = new Map();
    this.enabled = false;

    const J = this.joy;
    J.addEventListener('pointerdown', (e) => {
      if (this.pid !== null) return; this.pid = e.pointerId; J.setPointerCapture(e.pointerId);
      this.ox = e.clientX; this.oy = e.clientY;
      this.base.style.display = 'block'; this.base.style.left = this.ox + 'px'; this.base.style.top = this.oy + 'px'; this.move(e);
    });
    J.addEventListener('pointermove', (e) => { if (e.pointerId === this.pid) this.move(e); });
    const end = (e) => { if (e.pointerId !== this.pid) return; this.pid = null; this.sx = this.sy = 0; this.base.style.display = 'none'; };
    J.addEventListener('pointerup', end); J.addEventListener('pointercancel', end);

    this.root.querySelectorAll('[data-act]').forEach((b) => {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down');
        if (act === 'block') this.block = true; else this.q.push(act);
        if (navigator.vibrate) navigator.vibrate(8);
      });
      const up = () => { b.classList.remove('down'); if (act === 'block') this.block = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });

    const map = { KeyJ: 'punch', KeyK: 'kick', Space: 'jump', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyU: 'special', KeyE: 'special', KeyI: 'special' };
    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (map[e.code]) this.q.push(map[e.code]);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.block = false; this.sx = this.sy = 0; });
  }
  move(e) {
    let dx = e.clientX - this.ox, dy = e.clientY - this.oy; const l = Math.hypot(dx, dy);
    if (l > this.RAD) { dx *= this.RAD / l; dy *= this.RAD / l; }
    this.sx = dx / this.RAD; this.sy = -dy / this.RAD;
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  setTouchVisible(v) { this.root.style.display = v ? 'block' : 'none'; }
  clear() { this.q.length = 0; this.sx = this.sy = 0; this.block = false; this.keys.clear(); }
  // basis: camera forward on the ground plane {x,z}. Returns world-space move vector.
  read(basis) {
    let sx = this.sx, sy = this.sy; const k = this.keys;
    const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const ky = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (kx || ky) { sx = kx; sy = ky; }
    const l = Math.hypot(sx, sy); if (l > 1) { sx /= l; sy /= l; }
    const fx = basis.x, fz = basis.z, rx = -fz, rz = fx; // right = (-fz, fx)
    return { mx: rx * sx + fx * sy, mz: rz * sx + fz * sy, block: this.block || k.has('KeyL') || k.has('KeyB'), press: this.q.splice(0) };
  }
}
