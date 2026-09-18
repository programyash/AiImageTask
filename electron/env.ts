/**
 * Environment/configuration loading for the Electron main process.
 *
 * The Gemini API key is read here and never leaves the main process: it is not
 * exposed through the preload bridge, not sent over IPC, and not included in
 * any error message returned to the renderer.
 */
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { config as loadDotenv } from 'dotenv';

/**
 * API key compiled into the production bundle by scripts/esbuild.config.mjs
 * (from the project's .env at build time). Empty string in development and
 * when no key was available at build time. A run-time .env or OS environment
 * variable always takes precedence over this value.
 */
declare const __BUNDLED_GEMINI_API_KEY__: string;
const BUNDLED_API_KEY: string =
  typeof __BUNDLED_GEMINI_API_KEY__ === 'string' ? __BUNDLED_GEMINI_API_KEY__ : '';

export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Tried in order if the primary model is rejected by the API for this key.
 * Google has started returning 404 "no longer available to new users" for
 * gemini-2.5-flash on newly created keys and recommends gemini-3.6-flash;
 * `gemini-flash-latest` is the alias Google keeps pointed at the current
 * flagship Flash model, so it is the last resort.
 */
export const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'] as const;

export const REQUEST_TIMEOUT_MS = 90_000;

let loaded = false;
let resolvedEnvPath: string | null = null;

/**
 * Candidate locations for a `.env` file, most specific first.
 *
 * In development the project root is the obvious place. In a packaged build
 * there is no project root, so we also look next to the executable and in the
 * per-user app data directory - that is how a tester configures the installed
 * app without rebuilding it.
 */
function envFileCandidates(): string[] {
  const candidates: string[] = [];

  if (!app.isPackaged) {
    // __dirname is <project>/dist-electron when running the compiled main.
    candidates.push(path.resolve(process.cwd(), '.env'));
    candidates.push(path.resolve(__dirname, '..', '.env'));
  } else {
    candidates.push(path.join(path.dirname(app.getPath('exe')), '.env'));
    candidates.push(path.join(process.resourcesPath, '.env'));
    candidates.push(path.join(app.getPath('userData'), '.env'));
  }

  return [...new Set(candidates)];
}

/**
 * Loads `.env` once. Values already present in the real process environment
 * take precedence (dotenv does not override by default), so `set GEMINI_API_KEY=...`
 * in a shell still wins over a stale file.
 */
export function loadEnvironment(): { loadedFrom: string | null } {
  if (loaded) return { loadedFrom: resolvedEnvPath };
  loaded = true;

  for (const candidate of envFileCandidates()) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const result = loadDotenv({ path: candidate, quiet: true });
      if (!result.error) {
        resolvedEnvPath = candidate;
        break;
      }
    } catch {
      // An unreadable .env is not fatal - the OS environment may still supply
      // the key, and a missing key is reported to the UI as MISSING_API_KEY.
    }
  }

  return { loadedFrom: resolvedEnvPath };
}

/**
 * The API key, or null when it is absent/blank. Main process only.
 * Resolution order: OS environment / run-time .env, then the key bundled at build time.
 */
export function getApiKey(): string | null {
  loadEnvironment();
  const key = process.env.GEMINI_API_KEY?.trim() || BUNDLED_API_KEY.trim();
  if (!key) return null;
  // Guard against someone pasting the placeholder from .env.example.
  if (/^(your_gemini_api_key_here|YOUR_NEW_KEY_HERE)$/i.test(key)) return null;
  return key;
}

/** The configured model id, overridable with GEMINI_MODEL. */
export function getModelName(): string {
  loadEnvironment();
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Where the .env file was loaded from, for the startup log only. */
export function getEnvFilePath(): string | null {
  loadEnvironment();
  return resolvedEnvPath;
}
