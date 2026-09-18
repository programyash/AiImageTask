/**
 * Registers every IPC handler exposed to the renderer. Adding a channel here
 * (and to `shared/ipc.ts` + `preload.ts`) is the only way to widen the surface.
 */
import { app, ipcMain } from 'electron';
import { IPC_CHANNELS, type AppStatus } from '../../shared/ipc';
import { getApiKey, getModelName } from '../env';
import { getResolvedModel } from '../services/gemini';
import { registerAnalyzeImageHandler } from './analyzeImage';

/**
 * Status for the UI. Reports only *whether* a key exists - the key itself
 * never crosses the IPC boundary. The model is the configured one until a
 * request has succeeded, after which it is the model that actually answered.
 */
function registerStatusHandler(): void {
  ipcMain.handle(IPC_CHANNELS.getStatus, (): AppStatus => {
    return {
      hasApiKey: getApiKey() !== null,
      model: getResolvedModel() ?? getModelName(),
      appVersion: app.getVersion(),
      isPackaged: app.isPackaged,
    };
  });
}

export function registerIpcHandlers(): void {
  registerAnalyzeImageHandler();
  registerStatusHandler();
}
