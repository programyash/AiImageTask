/**
 * Renderer-side analysis service.
 *
 * The only thing between the UI and the preload bridge. It never touches the
 * Gemini API, an API key, or Node: it validates and prepares an image locally,
 * then asks the main process to analyze it.
 */
import type { AnalysisError, AnalyzeImageResponse, AppStatus } from '@shared/ipc';
import { ImageError, prepareImage, type PreparedImage } from '@/lib/imageFile';

export type PrepareResult = { ok: true; image: PreparedImage } | { ok: false; error: AnalysisError };

/** Returned when the app runs outside Electron and the preload bridge is absent. */
const BRIDGE_UNAVAILABLE: AnalyzeImageResponse = {
  ok: false,
  error: {
    code: 'UNKNOWN',
    message: 'The desktop bridge is unavailable.',
    detail:
      'This window is not connected to the Electron main process. Restart the app with "npm run dev".',
    retryable: false,
  },
};

/**
 * Validates, decodes and downscales a file so it can be previewed and sent.
 * Every failure comes back as a typed `AnalysisError`, so the UI has exactly
 * one error path for both local and remote problems.
 */
export async function prepareForAnalysis(file: File): Promise<PrepareResult> {
  try {
    return { ok: true, image: await prepareImage(file) };
  } catch (error) {
    if (error instanceof ImageError) {
      return { ok: false, error: error.analysisError };
    }

    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: 'The image could not be prepared for analysis.',
        detail: error instanceof Error ? error.message : undefined,
        retryable: true,
      },
    };
  }
}

/** Sends an already-prepared image to the main process for Gemini analysis. */
export async function analyzePreparedImage(image: PreparedImage): Promise<AnalyzeImageResponse> {
  const api = window.electronAPI;
  if (!api) return BRIDGE_UNAVAILABLE;

  try {
    return await api.analyzeImage({
      base64: image.base64,
      mimeType: image.mimeType,
      fileName: image.fileName,
    });
  } catch (error) {
    // `ipcRenderer.invoke` only rejects when the channel itself fails, which
    // means the main process is gone or the handler was never registered.
    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: 'The analysis request could not be delivered.',
        detail: error instanceof Error ? error.message : undefined,
        retryable: true,
      },
    };
  }
}

/** Reads startup status: which model is configured and whether a key exists. */
export async function fetchStatus(): Promise<AppStatus | null> {
  const api = window.electronAPI;
  if (!api) return null;

  try {
    return await api.getStatus();
  } catch {
    return null;
  }
}
