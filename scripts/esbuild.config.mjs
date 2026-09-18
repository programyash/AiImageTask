/**
 * Shared esbuild configuration for the Electron main process and preload script.
 *
 * Both are emitted as CommonJS (`.cjs`) so they load correctly even though the
 * project's package.json declares `"type": "module"` for the renderer tooling.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ watch?: boolean }} [options]
 * @returns {import('esbuild').BuildOptions}
 */
export function createElectronBuildOptions({ watch = false } = {}) {
  const isProduction = !watch;

  return {
    entryPoints: [
      path.join(projectRoot, 'electron', 'main.ts'),
      path.join(projectRoot, 'electron', 'preload.ts'),
    ],
    outdir: path.join(projectRoot, 'dist-electron'),
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    // Electron 38 ships Node 22; targeting node20 is a safe floor.
    target: 'node20',
    format: 'cjs',
    // Runtime dependencies are resolved from node_modules at run time.
    // electron-builder packs them automatically because they are declared
    // under "dependencies" in package.json.
    external: ['electron', '@google/genai', 'dotenv', 'zod'],
    sourcemap: isProduction ? false : 'inline',
    minify: isProduction,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
    },
  };
}
