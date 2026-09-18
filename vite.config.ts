import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Production Content-Security-Policy.
 *
 * The packaged renderer is a static page loaded over `file://` that talks to
 * Gemini only through IPC, so it needs no network access at all - hence
 * `connect-src 'none'`. `style-src 'unsafe-inline'` is required because React
 * emits inline `style` attributes.
 */
const PRODUCTION_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/**
 * Development Content-Security-Policy.
 *
 * Vite's HMR client needs a websocket back to the dev server, and the React
 * Fast Refresh preamble is injected as an inline script. Neither is present in
 * the production bundle, which is why the two policies are separate.
 */
const DEVELOPMENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Replaces the `%CSP%` placeholder in index.html with the per-mode policy. */
function cspPlugin(): Plugin {
  return {
    name: 'ai-image-analyzer:csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return html.replace('%CSP%', ctx.server ? DEVELOPMENT_CSP : PRODUCTION_CSP);
      },
    },
  };
}

export default defineConfig({
  root: rootDir,
  // Relative asset URLs are required because the packaged app loads
  // index.html from disk over the file:// protocol.
  base: './',
  plugins: [react(), cspPlugin()],
  resolve: {
    alias: {
      '@': path.join(rootDir, 'src'),
      '@shared': path.join(rootDir, 'shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Electron bundles a known-recent Chromium, so no legacy transpiling.
    target: 'chrome120',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    strictPort: false,
    // Keep the file watcher and dependency scanner out of build output.
    watch: { ignored: ['**/release/**', '**/dist/**', '**/dist-electron/**'] },
  },
  optimizeDeps: {
    // Without this Vite's dependency scanner walks every *.html under the
    // project root, including licence files inside release/win-unpacked.
    entries: ['index.html'],
  },
  clearScreen: false,
});
