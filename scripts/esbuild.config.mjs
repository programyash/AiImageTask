/**
 * Shared esbuild configuration for the Electron main process and preload script.
 *
 * Both are emitted as CommonJS (`.cjs`) so they load correctly even though the
 * project's package.json declares `"type": "module"` for the renderer tooling.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { parse as parseDotenv } from 'dotenv';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Reads GEMINI_API_KEY from the project's `.env` (or the build shell) so it can
 * be compiled into the production main-process bundle. This lets end users
 * install the packaged app and use it immediately without configuring a key.
 *
 * Only done for production builds; in dev the key is read at run time as usual.
 * Returns an empty string when no key is available so the build still succeeds.
 */
function readBundledApiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return '';
  const parsed = parseDotenv(fs.readFileSync(envPath));
  return parsed.GEMINI_API_KEY?.trim() ?? '';
}

/**
 * @param {{ watch?: boolean }} [options]
 * @returns {import('esbuild').BuildOptions}
 */
export function createElectronBuildOptions({ watch = false } = {}) {
  const isProduction = !watch;
  const bundledKey = isProduction ? readBundledApiKey() : '';
  if (isProduction) {
    console.log(
      bundledKey
        ? '[esbuild] GEMINI_API_KEY found - bundling it into the packaged app'
        : '[esbuild] WARNING: no GEMINI_API_KEY in .env - packaged app will need a key at run time',
    );
  }

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
      __BUNDLED_GEMINI_API_KEY__: JSON.stringify(bundledKey),
    },
  };
}
