// Audio: synthesized SFX + procedural music (WebAudio) and character voice lines.
// Voices: if /audio/voices/manifest.json lists real recordings they are played;
// otherwise the browser speech-synthesis fallback speaks the lines (see README).
let ctx = null, master, musicG, sfxG, voiceG, noiseBuf;
export const vol = { master: 0.8, music: 0.5, sfx: 0.8, voice: 0.9, mute: false };
try { Object.assign(vol, JSON.parse(localStorage.getItem('bba_vol') || '{}')); } catch { /* ignore */ }

export function saveVol() { try { localStorage.setItem('bba_vol', JSON.stringify(vol)); } catch { /* ignore */ } applyVol(); }
function applyVol() {
  if (!ctx) return;
  master.gain.value = vol.mute ? 0 : vol.master;
  musicG.gain.value = vol.music * 0.5; sfxG.gain.value = vol.sfx; voiceG.gain.value = vol.voice;
}

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); musicG = ctx.createGain(); sfxG = ctx.createGain(); voiceG = ctx.createGain();
  musicG.connect(master); sfxG.connect(master); voiceG.connect(master);
  const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVol();
  loadManifest();
}

function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, v = 0.3, t = ctx.currentTime, out = sfxG) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.005, dur, v); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, ftype, f0, f1, v = 0.3, t = ctx.currentTime, out = sfxG, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = ftype; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, dur, v);
  s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.05);
}

const SFX = {
  click: () => tone('square', 900, 700, 0.05, 0.12),
  select: () => { tone('triangle', 520, 780, 0.12, 0.2); tone('triangle', 780, 1040, 0.14, 0.15, ctx.currentTime + 0.07); },
  beep: () => tone('square', 620, 620, 0.12, 0.2),
  fight: () => { tone('sawtooth', 440, 880, 0.25, 0.25); tone('square', 880, 880, 0.3, 0.15, ctx.currentTime + 0.1); },
  swing: () => noise(0.12, 'highpass', 800, 3500, 0.12, undefined, undefined, 0.8),
  punch: () => { noise(0.09, 'lowpass', 2400, 400, 0.5); tone('sine', 150, 60, 0.12, 0.6); },
  kick: () => { noise(0.13, 'lowpass', 1800, 250, 0.7); tone('sine', 110, 40, 0.18, 0.8); },
  heavy: () => { noise(0.2, 'lowpass', 2200, 150, 0.8); tone('sine', 90, 30, 0.3, 1); tone('sawtooth', 200, 50, 0.15, 0.2); },
  block: () => { tone('square', 540, 470, 0.1, 0.2); noise(0.06, 'highpass', 3000, 5000, 0.2); },
  perfect: () => { tone('triangle', 880, 1760, 0.2, 0.3); tone('sine', 1320, 1320, 0.3, 0.2); },
  guardbreak: () => { noise(0.35, 'highpass', 4000, 800, 0.4); tone('sawtooth', 700, 100, 0.3, 0.3); },
  jump: () => tone('sine', 250, 560, 0.14, 0.2),
  dodge: () => noise(0.25, 'bandpass', 400, 2600, 0.35, undefined, undefined, 2),
  nope: () => tone('square', 160, 120, 0.12, 0.15),
  ko: () => { tone('sawtooth', 320, 40, 0.9, 0.5); noise(0.7, 'lowpass', 1500, 80, 0.8); tone('sine', 70, 25, 0.9, 1); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.35, 0.25, ctx.currentTime + i * 0.12)); },
  lose: () => { [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.4, 0.22, ctx.currentTime + i * 0.18)); },
  sp_ithun: () => { noise(0.4, 'bandpass', 3000, 200, 0.5, undefined, undefined, 3); tone('sawtooth', 900, 120, 0.35, 0.3); },
  sp_sumit: () => { tone('sine', 70, 28, 0.9, 1); noise(0.6, 'lowpass', 900, 60, 0.9); },
  sp_jisan: () => { for (let i = 0; i < 6; i++) tone('square', 600 + Math.random() * 1500, 200, 0.07, 0.15, ctx.currentTime + i * 0.12); },
  sp_jihad: () => { tone('sawtooth', 70, 220, 0.5, 0.5); tone('sawtooth', 75, 230, 0.5, 0.4); noise(0.5, 'lowpass', 2000, 200, 0.6); },
  sp_nihal: () => { tone('sine', 1320, 1320, 0.5, 0.25); tone('sine', 1760, 1760, 0.35, 0.18, ctx.currentTime + 0.05); noise(0.1, 'highpass', 5000, 7000, 0.2); },
  sp_rifat: () => { tone('sine', 1500, 300, 0.5, 0.3); tone('triangle', 1000, 250, 0.6, 0.2, ctx.currentTime + 0.08); },
};
export function sfx(name) { if (!ctx || vol.mute || !SFX[name]) return; try { SFX[name](); } catch { /* ignore */ } }

// ---------------------------------------------------------------------------
// Procedural music
// ---------------------------------------------------------------------------
const m2f = (n) => 440 * Math.pow(2, (n - 69) / 12);
function gen(seed, len = 16, density = 0.5) { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: len }, () => (r() < density ? Math.floor(r() * 7) : null)); }
const THEMES = {
  menu: { bpm: 98, root: 45, sc: [0, 3, 5, 7, 10], bass: [0, null, null, 0, null, null, 2, null, 0, null, null, 0, null, 3, null, 2], kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], lead: gen(11, 16, 0.4), bw: 'sawtooth', lw: 'triangle' },
  rooftop: { bpm: 126, root: 43, sc: [0, 3, 5, 7, 10], bass: [0, null, 0, null, 3, null, 0, null, 5, null, 0, null, 3, null, 7, null], kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], lead: gen(21, 16, 0.5), bw: 'sawtooth', lw: 'square' },
  underground: { bpm: 92, root: 38, sc: [0, 3, 5, 6, 7, 10], bass: [0, null, null, 0, null, 0, null, null, 3, null, null, 3, null, 2, null, null], kick: [0, 3, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], lead: gen(31, 16, 0.25), bw: 'square', lw: 'sawtooth' },
  electric: { bpm: 136, root: 45, sc: [0, 2, 4, 7, 9], bass: [0, 0, null, 0, 2, null, 0, null, 4, 4, null, 4, 2, null, 0, null], kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14, 15], lead: gen(41, 16, 0.7), bw: 'sawtooth', lw: 'square' },
  redarena: { bpm: 110, root: 40, sc: [0, 1, 4, 5, 7, 8], bass: [0, null, 0, 1, null, 0, null, 4, 0, null, 0, 1, null, 0, 5, null], kick: [0, 6, 8, 14], snare: [4, 12], hat: [2, 10], lead: gen(51, 16, 0.35), bw: 'sawtooth', lw: 'sawtooth' },
  teastall: { bpm: 104, root: 50, sc: [0, 1, 4, 5, 7, 8, 11], bass: [0, null, null, 0, null, 4, null, null, 0, null, null, 3, null, 4, null, null], kick: [0, 8], snare: [], hat: [4, 12], tabla: true, lead: gen(61, 16, 0.55), bw: 'triangle', lw: 'sawtooth' },
  moonroof: { bpm: 100, root: 47, sc: [0, 3, 5, 7, 10], bass: [0, null, null, null, 5, null, null, null, 3, null, null, null, 2, null, null, null], kick: [0, 8], snare: [12], hat: [4, 6, 10, 14], lead: gen(71, 16, 0.3), bw: 'sine', lw: 'triangle' },
};
let cur = null, th = null, timer = null, nextT = 0, stp = 0;
function note(deg, theme, oct) { const l = theme.sc.length; return theme.root + oct + theme.sc[((deg % l) + l) % l] + 12 * Math.floor(deg / l); }
function playStep(s, t) {
  const T = th;
  if (T.kick.includes(s)) { tone('sine', 130, 40, 0.16, 0.9, t, musicG); }
  if (T.snare.includes(s)) { noise(0.12, 'bandpass', 1800, 900, 0.5, t, musicG); }
  if (T.hat.includes(s)) { noise(0.04, 'highpass', 7000, 9000, 0.18, t, musicG); }
  if (T.tabla && (s === 6 || s === 10 || s === 14)) tone('sine', 220, 150, 0.12, 0.35, t, musicG);
  const b = T.bass[s]; if (b != null) tone(T.bw, m2f(note(b, T, -12)), m2f(note(b, T, -12)) * 0.98, 0.2, 0.35, t, musicG);
  const l = T.lead[s]; if (l != null && ((stp >> 4) % 2 === 0 || s % 4 === 0)) tone(T.lw, m2f(note(l, T, 12)), m2f(note(l, T, 12)), 0.16, 0.1, t, musicG);
}
export function music(name) {
  if (!ctx || name === cur) return;
  cur = name; th = THEMES[name];
  if (!th) { clearInterval(timer); timer = null; return; }
  nextT = ctx.currentTime + 0.1; stp = 0;
  if (!timer) timer = setInterval(() => {
    if (!ctx || !th) return;
    while (nextT < ctx.currentTime + 0.18) { playStep(stp % 16, nextT); nextT += 60 / th.bpm / 4; stp++; }
  }, 40);
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------
const VOICE = {
  ithun: { pitch: 1.45, rate: 1.25, select: ['Ithun here. Dhorte parbi na!'], taunt: ['Pichone takaw!', 'Too slow, bondhu!'], attack: ['Hyaa!', 'Shoom!'], special: ['Shadow Dash!'], victory: ['Ami to bolechilam, dhorte parbi na!'], defeat: ['Ohh... shadow haray na...'] },
  sumit: { pitch: 0.55, rate: 0.85, select: ['Sumit. Deyal ta bhangbi?'], taunt: ['Aay, aay, aaro jore mar!'], attack: ['Hrrgh!', 'Uhh!'], special: ['Ground Breaker!'], victory: ['Lohar deyal ke harano jay na!'], defeat: ['Deyal... pore gelo...'] },
  jisan: { pitch: 1.1, rate: 1.2, select: ['Jisan. Calculation complete.'], taunt: ['Logic bolche, tui harbi!'], attack: ['Tik!', 'Zap!'], special: ['Lightning Combo!'], victory: ['Easy math. Ami jitechi!'], defeat: ['Error... recalculating...'] },
  jihad: { pitch: 0.8, rate: 1.1, select: ['Jihad! Ami ready!'], taunt: ['Aaye, ekta sujog de!'], attack: ['Haa!', 'Rrah!'], special: ['Rage Burst!'], victory: ['Rag e jolsi, tai jitlam!'], defeat: ['Aah! Abar lorbo!'] },
  nihal: { pitch: 1.25, rate: 1.0, select: ['Nihal. Cha khabi naki maar khabi?'], taunt: ['Cha ta thanda hoye jacche!', 'Ei dekh, kichhu hoy ni!'], attack: ['Ei nao!', 'Chhup!'], special: ['Cha Cup Strike!'], victory: ['Cha er sathe jit, perfect combo!'], defeat: ['Aaare! Cha poreche!'] },
  rifat: { pitch: 0.95, rate: 0.95, select: ['Rifat. Chander alo ta dekhbi?'], taunt: ['Dhoro dhoro, parbi na.'], attack: ['Hup.', 'Tsk.'], special: ['Phantom Kick!'], victory: ['Chander alo te, ami shesh.'], defeat: ['Ami... hariye gelam...'] },
};
export const voiceLines = VOICE;
let manifest = null; const files = {};
async function loadManifest() {
  try { const r = await fetch('/audio/voices/manifest.json'); if (r.ok) manifest = await r.json(); } catch { /* no manifest: use speech */ }
}
let lastVoice = 0, lastAtk = 0;
export function voice(id, kind) {
  if (vol.mute || !ctx) return;
  const now = performance.now();
  if (kind === 'attack') { if (now - lastAtk < 2500 || Math.random() > 0.25) return; lastAtk = now; }
  else if (now - lastVoice < 700 && kind === 'taunt') return;
  lastVoice = now;
  // 1) real recordings from manifest: { "ithun": { "select": ["ithun_select.mp3"], ... } }
  const list = manifest && manifest[id] && manifest[id][kind];
  if (list && list.length) {
    const f = list[Math.floor(Math.random() * list.length)];
    try {
      const a = files[f] || (files[f] = new Audio('/audio/voices/' + f));
      a.volume = Math.min(1, vol.voice * vol.master); a.currentTime = 0; a.play().catch(() => {}); return;
    } catch { /* fall through to speech */ }
  }
  // 2) speech-synthesis fallback
  const ss = window.speechSynthesis; const V = VOICE[id]; if (!ss || !V) return;
  const lines = V[kind]; if (!lines) return;
  try {
    if (kind !== 'attack') ss.cancel();
    const u = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
    u.pitch = V.pitch; u.rate = V.rate; u.volume = Math.min(1, vol.voice * vol.master); u.lang = 'en-US';
    ss.speak(u);
  } catch { /* ignore */ }
}
