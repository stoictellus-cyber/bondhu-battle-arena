// Simple opponent AI. Emits the same input format as a human (world-space move vector).
import { CHARS } from '../../server/sim.js';

export function makeAI(level = 1) {
  return { level, t: 0.4, mode: 'approach', modeT: 0, blk: 0, side: 1, sideT: 0, prevThreat: false };
}

const free = (f) => f.st === 'idle' || f.st === 'run' || f.st === 'block';

export function aiInput(m, i, ai, dt) {
  const inp = { mx: 0, mz: 0, block: false, press: [] };
  if (m.phase !== 'fight') return inp;
  const f = m.f[i], o = m.f[1 - i], c = CHARS[f.id], sp = c.sp;
  const dx = o.x - f.x, dz = o.z - f.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  const L = ai.level;
  ai.t -= dt; ai.blk -= dt; ai.sideT -= dt; ai.modeT -= dt;
  if (ai.sideT <= 0) { ai.side = Math.random() < 0.5 ? 1 : -1; ai.sideT = 0.6 + Math.random() * 1.2; }

  // react to incoming attacks
  const threat = (o.st === 'punch' || o.st === 'kick' || o.st === 'special') && d < 3.4;
  if (threat && !ai.prevThreat) {
    const r = Math.random();
    if (r < [0.18, 0.4, 0.62][L]) ai.blk = 0.5;
    else if (r < [0.24, 0.5, 0.78][L] && f.sta > 25) inp.press.push('dodge');
  }
  ai.prevThreat = threat;
  if (ai.blk > 0) { inp.block = true; }

  if (ai.t <= 0 && free(f) && ai.blk <= 0) {
    ai.t = [0.38, 0.24, 0.15][L] * (0.7 + Math.random() * 0.6);
    const r = Math.random();
    const canSp = f.en >= sp.cost;
    if (d > 2.1) {
      if (canSp && sp.type === 'ranged' && d < 7.5 && r < 0.4) inp.press.push('special');
      else if (canSp && sp.type === 'dash' && d < 6 && r < 0.35) inp.press.push('special');
      else if (canSp && sp.type === 'teleport' && d < 6 && r < 0.2) inp.press.push('special');
      else { ai.mode = 'approach'; ai.modeT = 0.4; }
    } else {
      if (canSp && sp.type !== 'ranged' && r < 0.22 + 0.08 * L) inp.press.push('special');
      else if (r < 0.58) inp.press.push('punch');
      else if (r < 0.8) inp.press.push('kick');
      else if (r < 0.86) inp.press.push('jump');
      else { ai.mode = 'retreat'; ai.modeT = 0.35; }
    }
  }

  if (ai.mode === 'retreat' && ai.modeT > 0) { inp.mx = -ux; inp.mz = -uz; }
  else {
    const fw = d > 1.6 ? 1 : 0;
    inp.mx = ux * fw - uz * ai.side * 0.35;
    inp.mz = uz * fw + ux * ai.side * 0.35;
  }
  return inp;
}
