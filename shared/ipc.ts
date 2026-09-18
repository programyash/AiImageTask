/**
 * The complete contract between the React renderer and the Electron main
 * process. Nothing else crosses the IPC boundary.
 */
import type { ImageAnalysis } from './analysis';

/** IPC channel names. Kept in one place so preload/main/renderer cannot drift. */
export const IPC_CHANNELS = {
  analyzeImage: 'analyzer:analyze-image',
  getStatus: 'analyzer:get-status',
} as const;

/** Image formats we accept, mapped to the extensions shown in the file dialog. */
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/** Largest file we will read from disk at all (before any downscaling). */
export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Largest payload the main process will accept over IPC after downscaling. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/** Longest edge, in pixels, that the renderer downscales an image to. */
export const MAX_IMAGE_DIMENSION = 2048;

/**
 * Every failure the user can see. The renderer maps these to copy; the main
 * process never sends raw SDK errors or anything containing the API key.
 */
export type AnalysisErrorCode =
  | 'NO_IMAGE'
  | 'UNSUPPORTED_TYPE'
  | 'IMAGE_TOO_LARGE'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'SAFETY_BLOCKED'
  | 'EMPTY_RESPONSE'
  | 'INVALID_JSON'
  | 'VALIDATION_FAILED'
  | 'API_ERROR'
  | 'UNKNOWN';

export interface AnalysisError {
  code: AnalysisErrorCode;
  /** Human-readable, safe to render verbatim. Never contains secrets. */
  message: string;
  /** Optional extra context (e.g. which Zod fields failed). Also safe to render. */
  detail?: string;
  /** True when retrying the same image might succeed. */
  retryable: boolean;
}

/** What the renderer sends for analysis. */
export interface AnalyzeImageRequest {
  /** Base64-encoded image bytes, WITHOUT a `data:` URI prefix. */
  base64: string;
  mimeType: string;
  /** Original filename, used only for logging/diagnostics. */
  fileName?: string;
}

/**
 * IPC results are a discriminated union rather than a thrown error, so a
 * failure in main never surfaces in the renderer as an opaque
 * `Error invoking remote method ...` string.
 */
export type AnalyzeImageResponse =
  | { ok: true; data: ImageAnalysis; model: string; durationMs: number }
  | { ok: false; error: AnalysisError };

/** Startup information the UI uses to warn about configuration problems early. */
export interface AppStatus {
  /** Whether a GEMINI_API_KEY was found. The key itself is never sent. */
  hasApiKey: boolean;
  /** The Gemini model that will be used. */
  model: string;
  appVersion: string;
  isPackaged: boolean;
}

/** The entire surface exposed on `window.electronAPI` by the preload script. */
export interface ElectronApi {
  analyzeImage: (request: AnalyzeImageRequest) => Promise<AnalyzeImageResponse>;
  getStatus: () => Promise<AppStatus>;
}
