import { defineConfig } from 'vite';

// The client imports the shared simulation from ../server/sim.js, so allow the parent dir.
export default defineConfig({
  server: { host: true, port: 5173, fs: { allow: ['..'] } },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
