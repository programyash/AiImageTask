/**
 * Development launcher.
 *
 * Starts three things and keeps them in sync:
 *   1. the Vite dev server for the React renderer (with HMR),
 *   2. an esbuild watch build of electron/main.ts + electron/preload.ts,
 *   3. the Electron app itself, pointed at the Vite server.
 *
 * Editing a renderer file hot-reloads. Editing a main/preload file rebuilds and
 * restarts Electron automatically.
 *
 * Run with `npm run dev`.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';
import electronPath from 'electron';
import { context } from 'esbuild';
import { createServer } from 'vite';
import { createElectronBuildOptions, projectRoot } from './esbuild.config.mjs';

/** @type {import('node:child_process').ChildProcess | null} */
let electronProcess = null;
let shuttingDown = false;
let restartTimer = null;
let devServerUrl = '';

function startElectron() {
  // VS Code (and other Electron-based terminals) export ELECTRON_RUN_AS_NODE=1
  // to their integrated shells, which turns electron.exe into a plain Node
  // binary and breaks `require('electron')`. It must not leak into the app.
  const { ELECTRON_RUN_AS_NODE: _ignored, ...inheritedEnv } = process.env;

  const child = spawn(electronPath, ['.'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...inheritedEnv,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devServerUrl,
      // The dev Content-Security-Policy has to allow Vite's inline HMR
      // preamble, which Electron flags as insecure. The production build uses
      // a strict policy, so this only silences noise while developing.
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  });

  electronProcess = child;

  child.on('close', (code) => {
    // A process we deliberately replaced during a restart must not end the
    // session; only the *current* Electron window closing does.
    if (shuttingDown || electronProcess !== child) return;
    console.log(`\n[dev] Electron exited (code ${code ?? 0}). Shutting down.`);
    void shutdown(code ?? 0);
  });
}

function scheduleElectronRestart() {
  if (shuttingDown) return;
  clearTimeout(restartTimer);

  restartTimer = setTimeout(() => {
    restartTimer = null;
    console.log('[dev] main/preload changed - restarting Electron');

    if (electronProcess && !electronProcess.killed) {
      const previous = electronProcess;
      electronProcess = null;
      previous.once('close', startElectron);
      previous.kill();
    } else {
      startElectron();
    }
  }, 120);
}

/** Resolves once the watch build has produced its first successful output. */
let resolveFirstBuild;
const firstBuild = new Promise((resolve) => {
  resolveFirstBuild = resolve;
});

/** Rebuild hook: the first build unblocks startup, later ones restart Electron. */
const restartOnRebuildPlugin = {
  name: 'restart-electron-on-rebuild',
  setup(build) {
    let hasBuiltOnce = false;

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error('[esbuild] build failed; Electron was not restarted');
        return;
      }
      if (!hasBuiltOnce) {
        hasBuiltOnce = true;
        resolveFirstBuild();
        return;
      }
      scheduleElectronRestart();
    });
  },
};

const buildOptions = createElectronBuildOptions({ watch: true });
const esbuildContext = await context({
  ...buildOptions,
  plugins: [...(buildOptions.plugins ?? []), restartOnRebuildPlugin],
});

const viteServer = await createServer({ root: projectRoot, mode: 'development' });

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(restartTimer);

  if (electronProcess && !electronProcess.killed) electronProcess.kill();

  await Promise.allSettled([esbuildContext.dispose(), viteServer.close()]);
  process.exit(code);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void shutdown(0));
}

try {
  // The first esbuild pass must finish before Electron is allowed to start,
  // otherwise dist-electron/main.cjs may not exist yet. `watch()` performs
  // that initial build itself, so it is awaited via the plugin hook rather
  // than an extra `rebuild()` (which would count as a second build).
  await esbuildContext.watch();
  await firstBuild;

  await viteServer.listen();
  devServerUrl = viteServer.resolvedUrls?.local?.[0] ?? '';

  if (!devServerUrl) throw new Error('Vite did not report a local dev server URL.');

  console.log(`\n[dev] renderer:  ${devServerUrl}`);
  console.log('[dev] launching Electron...\n');

  startElectron();
} catch (error) {
  console.error('[dev] failed to start:', error);
  await shutdown(1);
}
