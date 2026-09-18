/** Removes all build output. Run with `npm run clean`. */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './esbuild.config.mjs';

for (const target of ['dist', 'dist-electron', 'release', 'tsconfig.tsbuildinfo']) {
  rmSync(path.join(projectRoot, target), { recursive: true, force: true });
  console.log(`[clean] removed ${target}`);
}
