/**
 * Preload script - the only bridge between the sandboxed renderer and Node.
 *
 * It runs with context isolation on and exposes exactly two functions. No
 * Node.js module, no `ipcRenderer` object, and no environment variable is ever
 * handed to the renderer; the renderer can only ask main to do these two
 * specific things.
 */
import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type AnalyzeImageRequest,
  type AnalyzeImageResponse,
  type AppStatus,
  type ElectronApi,
} from '../shared/ipc';

const electronAPI: ElectronApi = {
  /**
   * Sends a downscaled image to the main process for Gemini analysis.
   * Fields are copied explicitly so nothing unexpected from the renderer can
   * ride along into main.
   */
  analyzeImage: (request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.analyzeImage, {
      base64: String(request?.base64 ?? ''),
      mimeType: String(request?.mimeType ?? ''),
      fileName: request?.fileName ? String(request.fileName) : undefined,
    } satisfies AnalyzeImageRequest),

  /** Reads non-sensitive startup status (never the API key itself). */
  getStatus: (): Promise<AppStatus> => ipcRenderer.invoke(IPC_CHANNELS.getStatus),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
