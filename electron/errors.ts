/**
 * Error normalisation for the main process.
 *
 * Everything that can go wrong during an analysis is funnelled through here and
 * converted into a small, safe, user-facing `AnalysisError`. Raw SDK errors are
 * never forwarded verbatim, because Gemini error strings can echo the request
 * URL (which carries the API key as a query parameter).
 */
import type { AnalysisError, AnalysisErrorCode } from '../shared/ipc';
import { getApiKey } from './env';

/** Internal error carrying a user-facing code. */
export class AppError extends Error {
  readonly code: AnalysisErrorCode;
  readonly detail?: string;
  readonly retryable: boolean;

  constructor(
    code: AnalysisErrorCode,
    message: string,
    options: { detail?: string; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.detail = options.detail;
    this.retryable = options.retryable ?? false;
  }
}

const MAX_DETAIL_LENGTH = 300;

/**
 * Strips anything secret-looking out of a string before it can reach the UI or
 * a log file: the live API key, `key=`/`api_key=` query parameters, and
 * bearer tokens.
 */
export function redact(input: string): string {
  let output = input;

  const apiKey = getApiKey();
  if (apiKey) {
    output = output.split(apiKey).join('[REDACTED]');
  }

  output = output
    .replace(/([?&](?:key|api_key|apikey|access_token)=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/\b(AIza[0-9A-Za-z\-_]{10,})\b/g, '[REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');

  return output;
}

function truncate(value: string): string {
  const redacted = redact(value).replace(/\s+/g, ' ').trim();
  return redacted.length > MAX_DETAIL_LENGTH
    ? `${redacted.slice(0, MAX_DETAIL_LENGTH)}...`
    : redacted;
}

/** Pulls an HTTP status out of whatever shape the SDK threw. */
function extractStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;

  const candidate = error as { status?: unknown; code?: unknown; response?: { status?: unknown } };
  for (const value of [candidate.status, candidate.code, candidate.response?.status]) {
    if (typeof value === 'number' && value >= 100 && value < 600) return value;
  }

  // The SDK also throws `ApiError` whose message begins with the status code,
  // e.g. `got status: 429 Too Many Requests`.
  const message = error instanceof Error ? error.message : '';
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

const NETWORK_MARKERS = [
  'enotfound',
  'econnrefused',
  'econnreset',
  'eai_again',
  'etimedout',
  'ehostunreach',
  'enetunreach',
  'fetch failed',
  'failed to fetch',
  'network error',
  'socket hang up',
  'certificate',
  'unable to verify',
  'proxy',
];

/**
 * Converts any thrown value into the single error object the renderer renders.
 */
export function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      detail: error.detail ? truncate(error.detail) : undefined,
      retryable: error.retryable,
    };
  }

  const rawMessage = messageOf(error);
  const lower = rawMessage.toLowerCase();
  const status = extractStatus(error);
  const detail = truncate(rawMessage);

  // Only our own AbortSignal.timeout() produces these; a "504 Gateway Timeout"
  // from the API is a server error and is handled (and retried) further down.
  const isAbort =
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
    lower.includes('operation was aborted');

  if (isAbort) {
    return {
      code: 'TIMEOUT',
      message: 'The request to Gemini took too long and was cancelled.',
      detail: 'Try again, or use a smaller image.',
      retryable: true,
    };
  }

  if (NETWORK_MARKERS.some((marker) => lower.includes(marker))) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Could not reach the Gemini service.',
      detail: 'Check your internet connection or proxy settings and try again.',
      retryable: true,
    };
  }

  const looksLikeBadKey =
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission denied') ||
    lower.includes('unauthenticated');

  if (status === 401 || status === 403 || looksLikeBadKey) {
    return {
      code: 'INVALID_API_KEY',
      message: 'Gemini rejected the configured API key.',
      detail:
        'Check that GEMINI_API_KEY in your .env file is a current, enabled key from Google AI Studio.',
      retryable: false,
    };
  }

  // Gemini's reply when the bytes are not a decodable image (e.g. a text file
  // renamed .jpg that bypassed the renderer's own decode check).
  if (lower.includes('unable to process input image')) {
    return {
      code: 'UNSUPPORTED_TYPE',
      message: 'Gemini could not read this file as an image.',
      detail: 'The file may be corrupt, or its contents may not match its extension.',
      retryable: false,
    };
  }

  if (status === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      code: 'RATE_LIMITED',
      message: 'Gemini rate limit or quota reached.',
      detail: 'Wait a moment and try again, or check your quota in Google AI Studio.',
      retryable: true,
    };
  }

  if (status === 404 || lower.includes('not found') || lower.includes('is not supported')) {
    return {
      code: 'MODEL_UNAVAILABLE',
      message: 'The configured Gemini model is not available for this API key.',
      detail,
      retryable: false,
    };
  }

  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('prohibited')) {
    return {
      code: 'SAFETY_BLOCKED',
      message: 'Gemini declined to analyze this image.',
      detail: 'The image was blocked by the model safety filters. Try a different image.',
      retryable: false,
    };
  }

  if (status !== null && status >= 500) {
    return {
      code: 'API_ERROR',
      message: 'Gemini returned a server error.',
      detail: 'This is usually temporary. Please try again.',
      retryable: true,
    };
  }

  if (status !== null && status >= 400) {
    return {
      code: 'API_ERROR',
      message: 'Gemini rejected the request.',
      detail,
      retryable: false,
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Something went wrong while analyzing the image.',
    detail,
    retryable: true,
  };
}
