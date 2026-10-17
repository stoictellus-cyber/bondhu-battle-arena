// Socket.IO client wrapper. The server URL comes from VITE_SERVER_URL.
// Without it we assume the server runs on the same host at port 3001 (handy for LAN testing).
import { io } from 'socket.io-client';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3001`;
export const net = { sock: null, ping: 0 };

export function connect() {
  return new Promise((resolve, reject) => {
    if (net.sock && net.sock.connected) return resolve(net.sock);
    if (!net.sock) net.sock = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 700, reconnectionDelayMax: 3000 });
    const s = net.sock;
    const t = setTimeout(() => { s.off('connect', ok); reject(new Error('Cannot reach the game server.')); }, 9000);
    const ok = () => { clearTimeout(t); resolve(s); };
    if (s.connected) ok(); else s.once('connect', ok);
  });
}
export function ask(event, payload) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, err: 'Server did not answer.' }), 8000);
    net.sock.emit(event, payload, (r) => { clearTimeout(t); resolve(r); });
  });
}
export function startPing() {
  clearInterval(net._p);
  net._p = setInterval(() => {
    if (!net.sock || !net.sock.connected) return;
    const t0 = performance.now();
    net.sock.emit('ping:t', () => { net.ping = Math.round(performance.now() - t0); });
  }, 2000);
}
export function stopPing() { clearInterval(net._p); }
