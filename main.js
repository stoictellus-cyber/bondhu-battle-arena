// BONDHU BATTLE ARENA — MADE BY SAMI
import * as THREE from 'three';
import { CHARS, CHAR_IDS, createMatch, step, snapshot, angDiff } from '../../server/sim.js';
import { buildFighter, poseFighter, setLow, makeCup } from './fighters.js';
import { buildArena, disposeTree, ARENAS, ARENA_IDS } from './arenas.js';
import { FX } from './fx.js';
import * as A from './audio.js';
import { Controls } from './controls.js';
import { makeAI, aiInput } from './ai.js';
import { net, connect, ask, startPing, stopPing, SERVER_URL } from './net.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

// ---------------------------------------------------------------------------
// Settings & quality
// ---------------------------------------------------------------------------
const S = { quality: 'auto', touch: 'auto', name: '' };
try { Object.assign(S, JSON.parse(localStorage.getItem('bba_set') || '{}')); } catch { /* ignore */ }
const saveS = () => { try { localStorage.setItem('bba_set', JSON.stringify(S)); } catch { /* ignore */ } };
const qLevel = () => (S.quality !== 'auto' ? S.quality : IS_TOUCH ? 'medium' : 'high');
function qcfg() {
  const dpr = window.devicePixelRatio || 1;
  return {
    low: { pr: Math.min(dpr, 0.75), shadow: false, sm: 512, fx: 150, lights: false, low: true },
    medium: { pr: Math.min(dpr, 1), shadow: true, sm: 1024, fx: 300, lights: false, low: false },
    high: { pr: Math.min(dpr, 2), shadow: true, sm: 2048, fx: 500, lights: true, low: false },
  }[qLevel()];
}

const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: qLevel() === 'high', powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
let prCur = 1, prMax = 1;
function setPR() { renderer.setPixelRatio(prCur); renderer.setSize(innerWidth, innerHeight, false); }
function applyQuality() { const q = qcfg(); prMax = q.pr; prCur = q.pr; renderer.shadowMap.enabled = q.shadow; setLow(q.low); setPR(); }
function onResize() { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1.3 ? 62 : 52; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', onResize); addEventListener('orientationchange', () => setTimeout(onResize, 250));
applyQuality(); onResize();

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const controls = new Controls();
let screen = 'title', fight = null, menu = null;
function toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms); }
function overlayMsg(msg, ms = 800) { const t = $('overlayMsg'); t.textContent = msg; t.classList.add('show'); clearTimeout(overlayMsg._t); if (ms) overlayMsg._t = setTimeout(() => t.classList.remove('show'), ms); }
const hideOverlayMsg = () => $('overlayMsg').classList.remove('show');
function banner(text, ms = 900) {
  const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  b.style.animationDuration = ms + 'ms';
}
function show(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('s-' + name).classList.add('active');
  const inFight = ['hud'].includes(name);
  document.body.classList.toggle('playing', inFight);
  document.body.classList.toggle('sel', name === 'select');
  updateTouch();
}
function overlay(name, on) { $('s-' + name).classList.toggle('active', on); updateTouch(); }
function updateTouch() {
  const want = S.touch === 'on' || (S.touch === 'auto' && IS_TOUCH);
  const playing = fight && screen === 'hud' && !$('s-pause').classList.contains('active') && !$('s-result').classList.contains('active');
  controls.setTouchVisible(!!(want && playing));
  controls.enabled = !!playing;
}
const click = () => A.sfx('click');
document.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) { A.initAudio(); click(); } }, true);

// ---------------------------------------------------------------------------
// 3D menu scene (all six fighters on a stage)
// ---------------------------------------------------------------------------
function buildMenu() {
  if (menu) disposeTree(menu.scene);
  setLow(qcfg().low);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060d); scene.fog = new THREE.Fog(0x07060d, 10, 42);
  scene.add(new THREE.HemisphereLight(0x8899ff, 0x221133, 0.95));
  const key = new THREE.DirectionalLight(0xffd9a0, 1.3); key.position.set(3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2e63, 1.6); rim.position.set(-5, 4, -5); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.4, 48), new THREE.MeshStandardMaterial({ color: 0x15122a, roughness: 0.5, metalness: 0.3 }));
  floor.position.y = -0.2; scene.add(floor);
  for (const [r, c, y] of [[7.5, 0xffcf33, 3.4], [6.2, 0xff2e63, 3.4], [5, 0x00e5ff, 3.4]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 8, 80), new THREE.MeshBasicMaterial({ color: c })); t.position.set(0, y, -6); scene.add(t); t.userData.spin = r;
  }
  const fighters = CHAR_IDS.map((id, k) => {
    const F = buildFighter(id), x = (k - 2.5) * 1.7;
    F.root.position.set(x, 0.12, -Math.abs(k - 2.5) * 0.35); F.root.rotation.y = -x * 0.05; scene.add(F.root);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0x111122, emissive: CHARS[id].color, emissiveIntensity: 0.6 }));
    ped.position.set(x, 0.04, -Math.abs(k - 2.5) * 0.35); scene.add(ped);
    return { F, x, z: -Math.abs(k - 2.5) * 0.35, st: { id, st: 'idle', t: 0, dur: 1, hA: 0.3, cb: 0, y: 0, bf: 0 } };
  });
  const fx = new FX(scene, 160);
  menu = { scene, fighters, fx, t: 0, sel: -1, look: new THREE.Vector3(0, 1.2, 0), pos: new THREE.Vector3(0, 1.8, 8) };
}
function updateMenu(dt) {
  const M = menu; M.t += dt;
  M.scene.children.forEach((c) => { if (c.userData.spin) c.rotation.z += dt * 0.15 * (c.userData.spin > 6 ? 1 : -1); });
  M.fighters.forEach((o, k) => {
    const selected = screen === 'select' && k === M.sel;
    const cycle = Math.floor(M.t / 3) % 3;
    o.st.st = selected ? (cycle === 2 ? 'idle' : 'win') : 'idle';
    poseFighter(o.F, o.st, dt, M.t);
  });
  if (Math.random() < dt * 14) M.fx.emit((Math.random() - 0.5) * 16, 0.1, (Math.random() - 0.5) * 10 - 2, [0xffcf33, 0xff2e63, 0x00e5ff][Math.floor(Math.random() * 3)], 1, 0.5, 2.5, 1.2, 1);
  M.fx.update(dt);
  let tp, tl;
  if (screen === 'select' && M.sel >= 0) {
    const o = M.fighters[M.sel];
    const side = camera.aspect > 1.3 ? 1.0 : 0;
    tp = new THREE.Vector3(o.x + 0.9 + side * 0.4, 1.55, o.z + 4.3); tl = new THREE.Vector3(o.x + 0.2, 1.2, o.z);
  } else {
    tp = new THREE.Vector3(Math.sin(M.t * 0.25) * 1.8, 1.7, 8.2); tl = new THREE.Vector3(0, 1.15, -0.2);
  }
  const k = 1 - Math.exp(-3.2 * dt);
  M.pos.lerp(tp, k); M.look.lerp(tl, k);
  camera.position.copy(M.pos); camera.lookAt(M.look);
}

// ---------------------------------------------------------------------------
// Character select
// ---------------------------------------------------------------------------
let selMode = 'ai', picked = localStorage.getItem('bba_char') || 'ithun', arenaIdx = 0;
if (!CHARS[picked]) picked = 'ithun';
function buildSelectRow() {
  const row = $('selRow'); row.innerHTML = '';
  CHAR_IDS.forEach((id) => {
    const b = document.createElement('div'); b.className = 'pf'; b.style.setProperty('--c', CHARS[id].color); b.dataset.id = id;
    b.innerHTML = `${CHARS[id].name[0]}<small>${CHARS[id].name.toUpperCase()}</small>`;
    b.addEventListener('pointerdown', () => { A.initAudio(); choose(id, true); });
    row.appendChild(b);
  });
}
function choose(id, voice) {
  picked = id; localStorage.setItem('bba_char', id);
  const c = CHARS[id];
  document.querySelectorAll('.pf').forEach((e) => e.classList.toggle('sel', e.dataset.id === id));
  const sc = $('s-select'); sc.style.setProperty('--c', c.color);
  $('selName').textContent = c.name.toUpperCase(); $('selName').style.setProperty('--c', c.color);
  $('selTitle').textContent = c.title.toUpperCase(); $('selBio').textContent = c.bio;
  $('selStats').innerHTML = Object.entries(c.stats).map(([k, v]) => `<span>${k.toUpperCase()}</span><div class="s"><i style="width:${v * 10}%;--c:${c.color}"></i></div>`).join('');
  document.querySelector('.spbox').style.setProperty('--c', c.color);
  $('selSp').textContent = c.sp.name.toUpperCase(); $('selSpDesc').textContent = c.sp.desc;
  if (menu) menu.sel = CHAR_IDS.indexOf(id);
  if (selMode === 'ai' || selMode === 'training') { arenaIdx = ARENA_IDS.indexOf(c.arena); $('arName').textContent = ARENAS[ARENA_IDS[arenaIdx]].toUpperCase(); }
  if (voice) { A.sfx('select'); A.voice(id, 'select'); }
}
function startSelect(mode) {
  selMode = mode;
  $('arenaPick').style.display = mode === 'ai' || mode === 'training' ? 'flex' : 'none';
  $('selGo').textContent = mode === 'lobby' ? 'LOCK IN' : mode === 'quick' ? 'FIND MATCH' : 'FIGHT!';
  show('select'); choose(picked, false);
}
$('arPrev').onclick = () => { arenaIdx = (arenaIdx + ARENA_IDS.length - 1) % ARENA_IDS.length; $('arName').textContent = ARENAS[ARENA_IDS[arenaIdx]].toUpperCase(); };
$('arNext').onclick = () => { arenaIdx = (arenaIdx + 1) % ARENA_IDS.length; $('arName').textContent = ARENAS[ARENA_IDS[arenaIdx]].toUpperCase(); };
$('selBack').onclick = () => { if (selMode === 'lobby') show('lobby'); else if (selMode === 'quick') show('online'); else show('title'); };
$('selGo').onclick = async () => {
  if (selMode === 'ai' || selMode === 'training') {
    const others = CHAR_IDS.filter((c) => c !== picked); const opp = others[Math.floor(Math.random() * others.length)];
    startFight({ mode: selMode, chars: [picked, opp], names: ['YOU', CHARS[opp].name.toUpperCase()], arena: ARENA_IDS[arenaIdx] });
  } else if (selMode === 'lobby') {
    net.sock.emit('lobby:pick', { char: picked }); show('lobby');
  } else if (selMode === 'quick') {
    show('online'); $('onlineMsg').textContent = 'Searching for an opponent…'; $('btnQuick').disabled = true;
    const r = await ask('mm:join', { name: curName(), char: picked });
    if (!r.ok) { $('onlineMsg').textContent = r.err; $('btnQuick').disabled = false; }
  }
};

// ---------------------------------------------------------------------------
// Online flow
// ---------------------------------------------------------------------------
let online = null; // {code, slot, token, state}
const curName = () => { const n = $('inName').value.trim() || S.name || 'Fighter'; S.name = n; saveS(); return n; };
async function ensureNet() {
  try { const s = await connect(); bindSocket(s); startPing(); return true; }
  catch (e) { $('onlineMsg').textContent = `Cannot reach the game server (${SERVER_URL}). Is it running and is VITE_SERVER_URL set?`; return false; }
}
let bound = false;
function bindSocket(s) {
  if (bound) return; bound = true;
  s.on('room:state', (st) => { if (online) { online.state = st; if (screen === 'lobby') renderLobby(); } });
  s.on('room:paired', (r) => enterLobby(r));
  s.on('match:start', (d) => {
    hideOverlayMsg(); overlay('result', false);
    if (fight && fight.mode === 'online' && d.resume) { fight.snaps.length = 0; return; }
    startFight({ mode: 'online', chars: d.chars, names: d.names.map((n) => n.toUpperCase()), arena: d.arena, slot: online ? online.slot : 0 });
  });
  s.on('snap', (d) => { if (fight && fight.mode === 'online') { fight.snaps.push({ at: performance.now(), s: d.s, ev: d.ev, fired: false }); if (fight.snaps.length > 10) fight.snaps.shift(); } });
  s.on('match:over', (d) => { if (fight && fight.mode === 'online') showResult(d.winner === online.slot, d.reason === 'forfeit' ? 'Your opponent left the match.' : `Score ${d.wins[online.slot]} – ${d.wins[1 - online.slot]}`, true); });
  s.on('peer:status', (d) => { if (!online || d.slot === online.slot) return; if (d.connected) { hideOverlayMsg(); toast('Opponent reconnected'); } else overlayMsg(`Opponent disconnected — waiting ${d.grace}s…`, 0); });
  s.on('disconnect', () => { if (online) overlayMsg('Connection lost — reconnecting…', 0); });
  s.on('connect', async () => {
    if (!online) return;
    const r = await ask('room:rejoin', { code: online.code, token: online.token });
    if (!r.ok) { hideOverlayMsg(); toast(r.err || 'Session expired'); leaveOnline(); } else { hideOverlayMsg(); online.slot = r.slot; online.state = r.state; if (!r.playing && screen === 'lobby') renderLobby(); }
  });
}
function enterLobby(r) {
  online = { code: r.code, slot: r.slot, token: r.token, state: r.state };
  try { sessionStorage.setItem('bba_room', JSON.stringify({ code: r.code })); } catch { /* ignore */ }
  history.replaceState(null, '', `${location.pathname}?room=${r.code}`);
  $('btnQuick').disabled = false; $('onlineMsg').textContent = '';
  if (r.state && r.state.phase === 'playing') return;
  show('lobby'); renderLobby();
  if (!online.state.players[online.slot].char) { toast('Choose your fighter'); }
}
function renderLobby() {
  const st = online.state; $('lobCode').textContent = st.code;
  $('lobPlayers').innerHTML = st.players.map((p, i) => p
    ? `<div class="pl ${p.connected ? 'on' : 'off'}" style="border-color:${p.char ? CHARS[p.char].color : '#555'}"><span class="dot"></span>${p.name}${i === online.slot ? ' (you)' : ''}<span class="ch">${p.char ? CHARS[p.char].name.toUpperCase() : 'PICKING…'}</span>${p.ready ? '<span class="rd">READY</span>' : ''}</div>`
    : '<div class="pl"><span class="dot"></span>Waiting for friend…</div>').join('');
  const me = st.players[online.slot];
  $('btnReady').textContent = me && me.ready ? 'UNREADY' : 'READY';
  const both = st.players[0] && st.players[1];
  $('lobMsg').textContent = both ? 'Both players connected — pick a fighter and press READY.' : 'Share the invite link or room code with your friend.';
}
const inviteLink = () => `${location.origin}${location.pathname}?room=${online.code}`;
$('btnCreate').onclick = async () => {
  A.initAudio(); const name = curName(); $('onlineMsg').textContent = 'Connecting…';
  if (!(await ensureNet())) return;
  const r = await ask('room:create', { name, char: picked });
  if (!r.ok) return ($('onlineMsg').textContent = r.err);
  enterLobby(r);
};
$('btnJoin').onclick = async () => {
  A.initAudio(); const name = curName(); const code = $('inCode').value.trim().toUpperCase();
  if (code.length < 4) return ($('onlineMsg').textContent = 'Enter the 5-letter room code.');
  $('onlineMsg').textContent = 'Connecting…';
  if (!(await ensureNet())) return;
  const r = await ask('room:join', { code, name, char: picked });
  if (!r.ok) return ($('onlineMsg').textContent = r.err);
  enterLobby(r);
};
$('btnQuick').onclick = async () => { A.initAudio(); curName(); $('onlineMsg').textContent = 'Connecting…'; if (!(await ensureNet())) return; startSelect('quick'); };
$('btnCopy').onclick = async () => { try { await navigator.clipboard.writeText(inviteLink()); toast('Invite link copied!'); } catch { prompt('Copy this invite link:', inviteLink()); } };
$('btnShare').onclick = async () => {
  const d = { title: 'BONDHU BATTLE ARENA', text: `Join my fight! Room ${online.code}`, url: inviteLink() };
  if (navigator.share) { try { await navigator.share(d); } catch { /* cancelled */ } } else $('btnCopy').click();
};
$('btnPick').onclick = () => startSelect('lobby');
$('btnReady').onclick = () => {
  const me = online.state.players[online.slot];
  if (!me.char) return toast('Choose your fighter first');
  net.sock.emit('lobby:ready', { ready: !me.ready });
};
function leaveOnline() {
  try { if (net.sock && net.sock.connected) { net.sock.emit('room:leave'); net.sock.emit('mm:cancel'); } } catch { /* ignore */ }
  online = null; try { sessionStorage.removeItem('bba_room'); } catch { /* ignore */ }
  history.replaceState(null, '', location.pathname);
  if (fight) stopFight();
  overlay('result', false); overlay('pause', false); hideOverlayMsg();
  A.music('menu'); show('title'); $('mainMenu').classList.remove('hidden');
}
$('btnLeave').onclick = leaveOnline;

// ---------------------------------------------------------------------------
// Fight
// ---------------------------------------------------------------------------
function startFight(o) {
  stopFight(false);
  const q = qcfg(); setLow(q.low);
  const scene = new THREE.Scene();
  const arena = buildArena(o.arena, q);
  scene.add(arena.root); scene.background = new THREE.Color(arena.bg); scene.fog = new THREE.Fog(...arena.fog);
  const fighters = o.chars.map((id) => { const F = buildFighter(id); scene.add(F.root); return F; });
  const fx = new FX(scene, q.fx);
  fight = {
    mode: o.mode, ids: o.chars, names: o.names, arena, scene, fighters, fx, mySlot: o.slot || 0, opts: o,
    m: o.mode === 'online' ? null : createMatch(o.chars, { training: o.mode === 'training' }),
    ai: makeAI(1), acc: 0, hitstop: 0, slowT: 0, snaps: [], view: null, camAng: 0, camTarget: 0, camPunch: 0, shake: 0,
    basis: { x: 0, z: -1 }, hpLag: [1, 1], time: 0, sendT: 0, paused: false, t0: performance.now(), dummy: 'idle', comboT: 0, over: false,
  };
  $('n0').textContent = o.names[0]; $('n1').textContent = o.names[1];
  $('btnDummy').classList.toggle('hidden', o.mode !== 'training'); $('btnDummy').textContent = 'DUMMY: IDLE';
  $('btnPause').classList.remove('hidden');
  $('rnd').textContent = o.mode === 'training' ? 'TRAINING' : 'ROUND 1';
  $('netInfo').textContent = '';
  overlay('result', false); overlay('pause', false);
  controls.clear(); show('hud');
  A.music(o.arena);
  if (o.mode === 'online') { startPing(); }
}
function stopFight(toMenu = true) {
  if (!fight) return;
  disposeTree(fight.arena.root);
  fight = null; controls.clear();
  if (toMenu) A.music('menu');
}
function dummyInput(F) {
  if (F.dummy === 'idle') return { mx: 0, mz: 0, block: false, press: [] };
  if (F.dummy === 'block') return { mx: 0, mz: 0, block: true, press: [] };
  return aiInput(F.m, 1, F.ai, STEP);
}
$('btnDummy').onclick = () => { const F = fight; F.dummy = F.dummy === 'idle' ? 'block' : F.dummy === 'block' ? 'fight' : 'idle'; $('btnDummy').textContent = 'DUMMY: ' + F.dummy.toUpperCase(); F.ai.level = 0; };
$('btnPause').onclick = () => { if (!fight) return; if (fight.mode !== 'online') fight.paused = true; $('pRestart').style.display = fight.mode === 'online' ? 'none' : ''; overlay('pause', true); };
$('pResume').onclick = () => { if (fight) fight.paused = false; overlay('pause', false); };
$('pRestart').onclick = () => { const o = fight.opts; overlay('pause', false); startFight(o); };
$('pQuit').onclick = () => { overlay('pause', false); if (online) leaveOnline(); else { stopFight(); show('title'); } };
$('pSettings').onclick = () => { settingsFrom = 'pause'; overlay('pause', false); show('settings'); };
document.addEventListener('visibilitychange', () => { if (document.hidden && fight && fight.mode !== 'online' && screen === 'hud') $('btnPause').click(); });
addEventListener('keydown', (e) => { if (e.code === 'Escape' && fight && screen === 'hud') $('btnPause').click(); });

function showResult(win, sub, isOnline) {
  if (!fight || fight.over) return; fight.over = true;
  $('resTitle').textContent = win ? 'VICTORY' : 'DEFEAT'; $('resTitle').style.color = win ? '#ffcf33' : '#ff5a5a';
  $('resSub').textContent = sub || '';
  $('resAgain').textContent = isOnline ? 'BACK TO LOBBY' : 'REMATCH';
  A.sfx(win ? 'win' : 'lose'); overlay('result', true);
}
$('resAgain').onclick = () => {
  overlay('result', false);
  if (online) { stopFight(); show('lobby'); renderLobby(); A.music('menu'); } else { const o = fight.opts; startFight(o); }
};
$('resMenu').onclick = () => { overlay('result', false); if (online) leaveOnline(); else { stopFight(); show('title'); } };

// -- events (sound, particles, camera) -------------------------------------
const FXC = { ithun: 0x7a3cff, sumit: 0xc98a3a, jisan: 0x6fd8ff, jihad: 0xff3a1a, nihal: 0xc2621a, rifat: 0xdbe6ff };
function onEvents(evs) {
  const F = fight; if (!F) return;
  const fx = F.fx;
  for (const e of evs) {
    switch (e.t) {
      case 'cd': banner(String(e.n), 700); A.sfx('beep'); break;
      case 'fight': banner('FIGHT!', 1000); A.sfx('fight'); A.voice(F.ids[Math.floor(Math.random() * 2)], 'taunt'); break;
      case 'roundStart': banner('ROUND ' + e.n, 1200); F.hpLag = [1, 1]; F.over = false; break;
      case 'swing': A.sfx('swing'); A.voice(F.ids[e.i], 'attack'); break;
      case 'jump': A.sfx('jump'); break;
      case 'dodge': A.sfx('dodge'); fx.ring(e.x, e.z, 0xffffff, 1.2, 0.3); break;
      case 'noen': if (e.i === F.mySlot || F.mode !== 'online') { A.sfx('nope'); } break;
      case 'hit': {
        const col = FXC[F.ids[e.a]] || 0xffffff;
        if (e.blocked) {
          A.sfx(e.perfect ? 'perfect' : 'block'); fx.emit(e.x, e.y, e.z, 0xbcd4ff, e.perfect ? 22 : 8, e.perfect ? 6 : 3, 0.3);
          if (e.perfect) { overlayMsg('PERFECT BLOCK!', 600); fx.ring(e.x, e.z, 0xbcd4ff, 2, 0.3); }
          if (e.gb) { A.sfx('guardbreak'); fx.ring(e.x, e.z, 0xffffff, 2.5, 0.4); overlayMsg('GUARD BREAK!', 700); }
          F.shake += 0.1;
        } else {
          A.sfx(e.kind === 'kick' ? 'kick' : e.heavy ? 'heavy' : 'punch');
          fx.emit(e.x, e.y, e.z, col, e.heavy ? 28 : 12, e.heavy ? 6.5 : 4, 0.45, -8);
          fx.emit(e.x, e.y, e.z, 0xffffff, e.heavy ? 8 : 4, 3, 0.2, 0);
          if (e.heavy) fx.ring(e.x, e.z, col, 2.2, 0.35);
          F.shake += e.heavy ? 0.5 : 0.18;
          if (e.heavy && F.mode !== 'online') F.hitstop = 0.07;
          if (e.cb >= 2) { const c = $('combo'); c.textContent = e.cb + ' HITS'; c.className = 'show ' + (e.a === 0 ? 'l' : 'r'); clearTimeout(F.comboT); F.comboT = setTimeout(() => { c.className = ''; }, 1400); }
          if (e.kind === 'special' && F.ids[e.a] === 'jisan') for (let k = 0; k < 3; k++) fx.bolt(e.x + (Math.random() - 0.5) * 1.2, e.y + 3.2, e.z + (Math.random() - 0.5) * 1.2, e.x, e.y, e.z, 0x9fe8ff, 0.2);
        }
        break;
      }
      case 'special': {
        A.sfx('sp_' + e.id); A.voice(e.id, 'special'); F.camPunch = 1; F.shake += 0.15;
        overlayMsg(CHARS[e.id].sp.name.toUpperCase(), 900);
        const v = F.view && F.view.f[e.i]; if (v) fx.ring(v.x, v.z, CHARS[e.id].color, 2.2, 0.5);
        break;
      }
      case 'dash': fx.ring(e.x, e.z, 0x7a3cff, 2.4, 0.4); fx.emit(e.x, 1, e.z, 0x4a1c99, 30, 3, 0.7, 0, 0); break;
      case 'aoe': {
        const c = FXC[e.id];
        fx.ring(e.x, e.z, c, e.r * 1.15, 0.55); fx.orb(e.x, 0.8, e.z, c, e.r * 0.55, 0.45);
        fx.emit(e.x, 0.3, e.z, c, 44, 7, 0.8, -9, 0.9);
        if (e.id === 'sumit') fx.emit(e.x, 0.3, e.z, 0x6b6460, 20, 5, 0.8, -12, 1.2);
        F.shake += 0.8; A.sfx(e.id === 'sumit' ? 'heavy' : 'sp_jihad'); break;
      }
      case 'teleport':
        fx.emit(e.fx, 1.1, e.fz, 0xdbe6ff, 26, 3, 0.6, 0, 0); fx.emit(e.tx, 1.1, e.tz, 0xdbe6ff, 26, 3, 0.6, 0, 0); fx.ring(e.tx, e.tz, 0xaac4ff, 2.2, 0.45); break;
      case 'proj': {
        const cup = makeCup(), dx = Math.sin(e.face), dz = Math.cos(e.face), sp = 28;
        fx.prop(cup, e.x + dx * 0.9, 1.4, e.z + dz * 0.9, dx * sp, dz * sp, Math.max(0.2, e.range / sp), 14, (p) => { fx.emit(p.x, 1.2, p.z, 0xc2621a, 24, 4, 0.6, -9); fx.emit(p.x, 1.2, p.z, 0xffffff, 8, 2, 0.4, -3); });
        break;
      }
      case 'ko': A.sfx('ko'); A.voice(F.ids[e.i], 'defeat'); banner('K.O.!', 1600); F.shake += 1.1; F.camPunch = 1.4; if (F.mode !== 'online') F.slowT = 1.1; break;
      case 'roundEnd': {
        if (e.w >= 0) { setTimeout(() => fight === F && A.voice(F.ids[e.w], 'victory'), 700); if (e.w >= 0 && F.view && F.view.f[1 - e.w].st !== 'ko') banner('TIME!', 1000); }
        else banner('DRAW', 1200);
        break;
      }
      case 'matchEnd':
        if (F.mode !== 'online') setTimeout(() => { if (fight === F) showResult(e.w === 0, `${F.names[e.w]} wins the match`, false); }, 3000);
        break;
    }
  }
}

// -- online snapshot interpolation -----------------------------------------
function interpOnline(F) {
  const Sn = F.snaps; if (!Sn.length) return null;
  const rt = performance.now() - 90;
  for (const sn of Sn) if (!sn.fired && sn.at <= rt) { sn.fired = true; if (sn.ev) onEvents(sn.ev); }
  let a = Sn[0], b = Sn[0];
  for (let k = Sn.length - 1; k >= 0; k--) if (Sn[k].at <= rt) { a = Sn[k]; b = Sn[k + 1] || Sn[k]; break; }
  const span = b.at - a.at, al = span > 0 ? clamp((rt - a.at) / span, 0, 1) : 1;
  const v = al >= 0.5 ? b.s : a.s;
  return {
    ...v,
    f: v.f.map((fv, i) => {
      const p = a.s.f[i], q = b.s.f[i];
      return { ...fv, x: lerp(p.x, q.x, al), y: lerp(p.y, q.y, al), z: lerp(p.z, q.z, al), fc: p.fc + angDiff(p.fc, q.fc) * al, hp: lerp(p.hp, q.hp, al), en: lerp(p.en, q.en, al), sta: lerp(p.sta, q.sta, al) };
    }),
  };
}

function updateCam(F, view, dt) {
  const a = view.f[0], b = view.f[1];
  const dx = b.x - a.x, dz = b.z - a.z, sep = Math.hypot(dx, dz);
  let fx_ = (a.x + b.x) / 2, fz_ = (a.z + b.z) / 2, dist = clamp(5.6 + sep * 0.95, 7.6, 14), look = 1.15;
  const ending = view.ph === 'roundEnd' || view.ph === 'matchEnd';
  if (ending && view.rw >= 0) { const w = view.f[view.rw]; fx_ = w.x; fz_ = w.z; dist = 4.6; look = 1.3; F.camAng += dt * 0.5; }
  else {
    if (sep > 0.3) { const ang = Math.atan2(-dz / sep, dx / sep), alt = ang + Math.PI; F.camTarget = Math.abs(angDiff(F.camAng, ang)) <= Math.abs(angDiff(F.camAng, alt)) ? ang : alt; }
    F.camAng += angDiff(F.camAng, F.camTarget) * (1 - Math.exp(-4 * dt));
  }
  dist *= 1 - F.camPunch * 0.16; F.camPunch = Math.max(0, F.camPunch - dt * 1.6);
  const h = 1.7 + dist * 0.2;
  let cx = fx_ + Math.sin(F.camAng) * dist, cz = fz_ + Math.cos(F.camAng) * dist;
  const r = Math.hypot(cx, cz); if (r > 15.5) { cx *= 15.5 / r; cz *= 15.5 / r; }
  F.shake *= Math.exp(-7 * dt);
  const s = F.shake * 0.22;
  camera.position.set(cx + (Math.random() - 0.5) * s, h + (Math.random() - 0.5) * s, cz + (Math.random() - 0.5) * s);
  camera.lookAt(fx_, look, fz_);
  F.basis.x = -Math.sin(F.camAng); F.basis.z = -Math.cos(F.camAng);
}

function updateHud(F, view, dt) {
  for (let i = 0; i < 2; i++) {
    const f = view.f[i], r = clamp(f.hp / f.mh, 0, 1);
    F.hpLag[i] = Math.max(r, F.hpLag[i] - dt * 0.35);
    $('hp' + i).style.transform = `scaleX(${r})`; $('hpl' + i).style.transform = `scaleX(${F.hpLag[i]})`;
    $('en' + i).style.transform = `scaleX(${clamp(f.en / 100, 0, 1)})`; $('sta' + i).style.transform = `scaleX(${clamp(f.sta / 100, 0, 1)})`;
    const pips = $('pips' + i); if (pips.dataset.w !== String(view.w[i]) || !pips.firstChild) { pips.dataset.w = String(view.w[i]); pips.innerHTML = [0, 1].map((k) => `<i class="${k < view.w[i] ? 'on' : ''}"></i>`).join(''); }
  }
  $('timer').textContent = view.tr ? '∞' : Math.ceil(view.tm);
  if (!view.tr) $('rnd').textContent = 'ROUND ' + view.rd;
  const me = view.f[F.mySlot], cost = CHARS[me.id].sp.cost, sp = $('bSp');
  sp.style.setProperty('--en', clamp((me.en / cost) * 100, 0, 100)); sp.classList.toggle('ready', me.en >= cost);
  if (F.mode === 'online') $('netInfo').textContent = `${net.ping} ms`;
}

function trails(F, view, dt) {
  for (const f of view.f) {
    if (f.id === 'ithun' && f.st === 'special' && f.t > 0.12 && f.t < 0.4) F.fx.emit(f.x, 1, f.z, 0x7a3cff, 3, 0.8, 0.4, 0, 0);
    else if (f.id === 'jihad' && f.bf && Math.random() < 0.35) F.fx.emit(f.x + (Math.random() - 0.5) * 0.6, 0.3, f.z + (Math.random() - 0.5) * 0.6, 0xff3a1a, 1, 1.2, 0.5, 4, 1);
    else if (f.id === 'jisan' && f.st === 'special') F.fx.emit(f.x + Math.sin(f.fc) * 0.9, 1.3, f.z + Math.cos(f.fc) * 0.9, 0x6fd8ff, 2, 3, 0.2, 0, 0);
    else if (f.id === 'sumit' && f.st === 'special' && f.t < 0.5) F.fx.emit(f.x, 2.6, f.z, 0xffa31a, 1, 1, 0.3, 0, 0);
    else if (f.id === 'rifat' && f.st === 'special' && f.t > 0.12 && f.t < 0.5) F.fx.emit(f.x, 1.2, f.z, 0xdbe6ff, 2, 1.5, 0.4, 0, 0);
    else if (f.id === 'nihal' && f.st === 'special' && f.t < 0.4) F.fx.emit(f.x - Math.sin(f.fc) * 0.3, 2, f.z - Math.cos(f.fc) * 0.3, 0xffd23f, 1, 1, 0.3, 0, 0);
    else if (f.st === 'run' && Math.random() < dt * 8) F.fx.emit(f.x, 0.05, f.z, 0xaaaaaa, 1, 0.5, 0.4, 0.5, 0.2);
  }
}

function updateFight(dt) {
  const F = fight;
  F.time += dt;
  let view = null;
  if (F.mode === 'online') {
    view = interpOnline(F);
    F.sendT += dt;
    if (F.sendT >= 1 / 30 && net.sock && net.sock.connected && !F.over && controls.enabled) { F.sendT = 0; net.sock.emit('input', controls.read(F.basis)); }
  } else if (!F.paused) {
    if (F.hitstop > 0) F.hitstop -= dt;
    else {
      let ts = 1; if (F.slowT > 0) { F.slowT -= dt; ts = 0.3; }
      F.acc += dt * ts;
      const inp0 = controls.enabled ? controls.read(F.basis) : { mx: 0, mz: 0, block: false, press: [] };
      let first = true, n = 0;
      while (F.acc >= STEP && n < 6) {
        const i0 = first ? inp0 : { ...inp0, press: [] }; first = false;
        const i1 = F.mode === 'training' ? dummyInput(F) : aiInput(F.m, 1, F.ai, STEP);
        const ev = []; step(F.m, [i0, i1], STEP, ev); if (ev.length) onEvents(ev);
        F.acc -= STEP; n++;
      }
    }
    view = snapshot(F.m);
  } else view = F.view;
  if (!view) return;
  F.view = view;
  for (let i = 0; i < 2; i++) {
    const fv = view.f[i], Fi = F.fighters[i];
    Fi.root.position.set(fv.x, fv.y, fv.z); Fi.root.rotation.y = fv.fc;
    poseFighter(Fi, fv, dt, F.time);
  }
  if (!F.paused) { trails(F, view, dt); F.fx.update(dt); if (F.arena.update) F.arena.update(dt, F.time); }
  updateCam(F, view, dt); updateHud(F, view, dt);
}

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------
let settingsFrom = 'title';
$('setQ').value = S.quality; $('setTouch').value = S.touch;
$('vMaster').value = A.vol.master; $('vMusic').value = A.vol.music; $('vSfx').value = A.vol.sfx; $('vVoice').value = A.vol.voice; $('vMute').checked = A.vol.mute;
$('setQ').onchange = (e) => { S.quality = e.target.value; saveS(); applyQuality(); buildMenu(); toast('Graphics applied. Antialiasing changes on reload.'); };
$('setTouch').onchange = (e) => { S.touch = e.target.value; saveS(); };
for (const [id, k] of [['vMaster', 'master'], ['vMusic', 'music'], ['vSfx', 'sfx'], ['vVoice', 'voice']]) $(id).oninput = (e) => { A.vol[k] = +e.target.value; A.saveVol(); };
$('vMute').onchange = (e) => { A.vol.mute = e.target.checked; A.saveVol(); };
$('setBack').onclick = () => { if (settingsFrom === 'pause' && fight) { show('hud'); overlay('pause', true); } else show('title'); settingsFrom = 'title'; };

// ---------------------------------------------------------------------------
// Title / menu wiring
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  const g = b.dataset.go;
  if (g === 'title') { show('title'); $('mainMenu').classList.remove('hidden'); }
  else if (g === 'online') { show('online'); $('inName').value = S.name || ''; $('onlineMsg').textContent = ''; }
  else if (g === 'ai' || g === 'training') startSelect(g);
  else if (g === 'settings') { settingsFrom = 'title'; show('settings'); }
}));
$('tapStart').addEventListener('click', () => {
  A.initAudio(); A.music('menu');
  if (IS_TOUCH) { try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); window.screen.orientation && window.screen.orientation.lock && window.screen.orientation.lock('landscape').catch(() => {}); } catch { /* ignore */ } }
  $('tapStart').classList.add('hidden'); $('mainMenu').classList.remove('hidden');
  if (new URLSearchParams(location.search).get('room')) { show('online'); $('inName').value = S.name || ''; $('onlineMsg').textContent = 'You were invited! Enter your name and press JOIN.'; }
});
const roomParam = (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 5);
if (roomParam) $('inCode').value = roomParam;
buildSelectRow(); buildMenu();

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (fight && (screen === 'hud' || screen === 'settings')) updateFight(dt);
  else if (menu) updateMenu(dt);
  renderer.render(fight && (screen === 'hud' || screen === 'settings') ? fight.scene : menu.scene, camera);
  if (S.quality === 'auto' && (!fight || now - fight.t0 > 3000)) {
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      if (fps < 42 && prCur > 0.55) { prCur = Math.max(0.55, prCur - 0.12); setPR(); }
      else if (fps > 57 && prCur < prMax) { prCur = Math.min(prMax, prCur + 0.08); setPR(); }
    }
  }
}
requestAnimationFrame(frame);
window.__bba = { get fight() { return fight; }, startFight };
