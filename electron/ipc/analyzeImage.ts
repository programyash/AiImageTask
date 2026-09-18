/**
 * IPC handler for image analysis.
 *
 * This is the only path from the renderer to Gemini. The handler never throws
 * across the IPC boundary: it always resolves with a discriminated union, so a
 * failure in main surfaces in the UI as a typed, human-readable error rather
 * than an opaque "Error invoking remote method" string.
 */
import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS, type AnalyzeImageRequest, type AnalyzeImageResponse } from '../../shared/ipc';
import { analyzeImage } from '../services/gemini';
import { redact, toAnalysisError } from '../errors';

/**
 * Rejects IPC traffic that did not originate from our own window (for example
 * from an iframe that somehow got loaded into the renderer).
 */
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  if (!url) return false;

  if (url.startsWith('file://')) return true;

  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function registerAnalyzeImageHandler(): void {
  ipcMain.handle(
    IPC_CHANNELS.analyzeImage,
    async (event, request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> => {
      if (!isTrustedSender(event)) {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN',
            message: 'The analysis request came from an untrusted source and was blocked.',
            retryable: false,
          },
        };
      }

      try {
        const { data, model, durationMs } = await analyzeImage(request);
        return { ok: true, data, model, durationMs };
      } catch (error) {
        const analysisError = toAnalysisError(error);

        // Logged for the developer console only; already stripped of secrets.
        console.error(
          `[analyze-image] ${analysisError.code}:`,
          redact(error instanceof Error ? (error.stack ?? error.message) : String(error)),
        );

        return { ok: false, error: analysisError };
      }
    },
  );
}
