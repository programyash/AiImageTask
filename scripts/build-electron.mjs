/**
 * One-off production build of the Electron main process and preload script.
 * Run via `npm run build:electron` (and indirectly by `npm run build`).
 */
import { build } from 'esbuild';
import { createElectronBuildOptions } from './esbuild.config.mjs';

await build(createElectronBuildOptions({ watch: false }));
console.log('[esbuild] electron main + preload built to dist-electron/');
