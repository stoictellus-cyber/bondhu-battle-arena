# BONDHU BATTLE ARENA — MADE BY SAMI

A real-time **3D** (Three.js / WebGL) fighting game with online 1v1 multiplayer (Node.js + Socket.IO).
Fighters: **Ithun, Sumit, Jisan, Jihad, Nihal, Rifat** — each with their own build, outfit, stats, special move,
voice lines, victory/defeat animations and home arena.

## Structure
```
bondhu-battle-arena/
├─ server/                 Node + Socket.IO multiplayer server (authoritative)
│  ├─ sim.js               Shared fight simulation (server runs it online; browser runs it offline)
│  ├─ index.js             Rooms, invite codes, matchmaking, 60 Hz sim, 30 Hz snapshots, reconnect
│  └─ test/                sim.test.mjs (balance + sanity), net.test.mjs (two-client end-to-end)
├─ client/                 Vite + Three.js frontend
│  ├─ index.html, src/style.css
│  └─ src/  main.js (game loop, UI flow, camera) · fighters.js · arenas.js · fx.js · audio.js
│            controls.js (touch + keyboard) · ai.js · net.js
│  └─ public/audio/voices  optional voice recordings (manifest.json)
├─ netlify.toml            frontend deploy config
└─ render.yaml             backend deploy config
```
The browser never decides combat online: it sends inputs only; the server simulates and broadcasts state.

## Run locally
Requires Node 18+.
```bash
cd server && npm install && npm start        # http://localhost:3001
cd client && npm install && npm run dev      # http://localhost:5173 (also on your LAN IP)
```
Offline modes (VS Computer, Training) need no server. For online play from a phone on the same Wi-Fi, open
`http://<your-computer-LAN-IP>:5173` — the client defaults to `http://<same-host>:3001` for the server.

Tests: `cd server && npm test` (`BALANCE_N=25 node test/sim.test.mjs` for a tighter balance read).

## Controls
Touch: left-side joystick, buttons SPECIAL / JUMP / BLOCK / KICK / PUNCH / DODGE (landscape).
Keyboard: WASD or arrows move · J punch · K kick · L block · Space jump · Shift dodge · U special.
Punch 3 times in a row for a combo finisher. Block right as a hit lands for a PERFECT BLOCK.
Special needs energy (purple bar); it fills as you fight.

## Deploy
**1. Backend (Render, or any Node host with WebSocket support)**
- New Web Service from this repo, root dir `server`, build `npm install --omit=dev`, start `npm start`
  (or use `render.yaml`).
- Env var `CLIENT_ORIGIN` = your frontend URL (comma-separate several). Leave unset to allow any origin while testing.
- Note the public URL, e.g. `https://bondhu-battle-arena-server.onrender.com`. Free tiers sleep when idle:
  the first connection can take ~30–60 s to wake — open the server URL once before a match.

**2. Frontend (Netlify)**
- New site from this repo (settings are in `netlify.toml`: base `client`, build `npm run build`, publish `dist`).
- Environment variable `VITE_SERVER_URL` = the backend URL from step 1 (must be `https://` because the site is https).
- Redeploy after changing it (Vite bakes it in at build time). Then set backend `CLIENT_ORIGIN` to the Netlify URL.

No secrets live in the frontend; the only config is the public server URL.

## Assets
Everything is generated in code, so nothing is required to run:
- 3D fighters and arenas: procedural (see `client/public/models/README.md` to use GLB/Mixamo models instead).
- Music and sound effects: synthesized with WebAudio.
- Voices: browser speech synthesis fallback (quality depends on the phone). For real voices, record the lines and
  list them in `client/public/audio/voices/manifest.json` (see the README there). No recorded voices are included.
- Likeness: the fighters are stylised characters built from the descriptions given, **not** likenesses of real
  people. Real photos could guide a custom model later.

## Two-phone online test checklist
1. Backend is running and its URL opens in a browser (shows `{"ok":true,...}`); frontend built with `VITE_SERVER_URL`.
2. Phone A: open the site, TAP TO START, ONLINE MATCH, enter a name, CREATE PRIVATE ROOM, pick a fighter.
3. Phone A: SHARE / COPY INVITE LINK and send it to phone B (or read out the 5-letter code).
4. Phone B (different network, e.g. mobile data, is a good test): open the link, enter a name, JOIN, pick a fighter.
5. Lobby on both shows two connected players and both characters; both press READY → countdown starts on both.
6. Check: both see the same positions, hits and health bars; specials look right on the opponent's screen; ping (bottom-left) is reasonable.
7. Finish a round; verify round wins and the VICTORY/DEFEAT screen match on both phones.
8. Reconnect: turn Wi-Fi off on one phone for ~5 s mid-fight and back on — the match should resume (grace period 20 s).
9. Quit mid-match on one phone — the other should get a win by forfeit.
10. Quick Match: both phones choose ONLINE MATCH → QUICK MATCH and pick a fighter; they should be paired automatically.
11. Try graphics LOW/MEDIUM in Settings if the frame rate drops (Auto adjusts resolution on its own).

## Known limits
- 1v1 only. Three or more players would need extra simulation and camera work.
- Online play uses interpolation with ~90 ms of buffering; there is no client-side prediction, so inputs feel
  ping-bound (fine on decent connections, laggy on poor ones).
- Matchmaking is a simple public queue (first two players), not skill-based.
