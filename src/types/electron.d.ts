/**
 * Type declaration for the bridge exposed by electron/preload.ts.
 *
 * `electronAPI` is the complete set of privileged operations available to the
 * renderer. It is optional because the React app also renders in a plain
 * browser tab (for example when opening the Vite dev URL directly), where the
 * preload script has not run.
 */
import type { ElectronApi } from '@shared/ipc';

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}

export {};
