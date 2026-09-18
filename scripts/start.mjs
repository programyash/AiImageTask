/**
 * Launches the built app (dist/ + dist-electron/) with Electron, without
 * packaging. Used by `npm run preview`.
 *
 * Exists instead of a bare `electron .` because Electron-based terminals
 * (VS Code) export ELECTRON_RUN_AS_NODE=1, which would turn electron.exe into a
 * plain Node binary and break `require('electron')`.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';
import electronPath from 'electron';
import { projectRoot } from './esbuild.config.mjs';

const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

const child = spawn(electronPath, ['.'], { cwd: projectRoot, stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
