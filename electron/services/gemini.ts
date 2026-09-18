/**
 * Gemini integration. Main process only.
 *
 * Uses the current Google Gen AI SDK (`@google/genai`), which replaced the
 * deprecated `@google/generative-ai` package. The image is sent as an inline
 * base64 part alongside a JSON response schema, and the reply is validated with
 * Zod before it is allowed anywhere near the UI.
 */
import { GoogleGenAI } from '@google/genai';
import { imageAnalysisSchema, normalizeAnalysis, type ImageAnalysis } from '../../shared/analysis';
import { MAX_UPLOAD_BYTES, SUPPORTED_MIME_TYPES, type AnalyzeImageRequest } from '../../shared/ipc';
import { AppError, toAnalysisError } from '../errors';
import { FALLBACK_MODELS, REQUEST_TIMEOUT_MS, getApiKey, getModelName } from '../env';
import { RESPONSE_SCHEMA, SYSTEM_INSTRUCTION, USER_PROMPT } from './prompt';

export interface AnalyzeResult {
  data: ImageAnalysis;
  model: string;
  durationMs: number;
}

/** Transient-failure retries per model, on top of the initial attempt. */
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

let cachedClient: { key: string; client: GoogleGenAI } | null = null;

function getClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AppError('MISSING_API_KEY', 'No Gemini API key is configured.', {
      detail:
        'Create a .env file containing GEMINI_API_KEY=your_key_here, then restart the app. See README.md for details.',
      retryable: false,
    });
  }

  if (cachedClient?.key !== apiKey) {
    cachedClient = { key: apiKey, client: new GoogleGenAI({ apiKey }) };
  }

  return cachedClient.client;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rough decoded byte length of a base64 string, without allocating a Buffer. */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Defensive validation of the IPC payload. The renderer already checks all of
 * this, but the main process must not trust its input.
 */
function validateRequest(request: AnalyzeImageRequest): { base64: string; mimeType: string } {
  if (!request || typeof request !== 'object') {
    throw new AppError('NO_IMAGE', 'No image was received.', { retryable: false });
  }

  const mimeType = String(request.mimeType ?? '')
    .toLowerCase()
    .trim();

  if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new AppError('UNSUPPORTED_TYPE', 'That image format is not supported.', {
      detail: 'Supported formats are JPG, PNG and WEBP.',
      retryable: false,
    });
  }

  let base64 = typeof request.base64 === 'string' ? request.base64.trim() : '';

  // Tolerate a full data URI even though the renderer strips the prefix.
  const dataUriMatch = base64.match(/^data:[^;,]+;base64,([\s\S]*)$/);
  if (dataUriMatch) base64 = dataUriMatch[1];
  base64 = base64.replace(/\s/g, '');

  if (!base64) {
    throw new AppError('NO_IMAGE', 'No image data was received.', { retryable: false });
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new AppError('NO_IMAGE', 'The image data could not be read.', {
      detail: 'The file may be corrupt. Try selecting it again.',
      retryable: false,
    });
  }

  if (base64ByteLength(base64) > MAX_UPLOAD_BYTES) {
    throw new AppError('IMAGE_TOO_LARGE', 'That image is too large to analyze.', {
      detail: `The image must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB after compression.`,
      retryable: false,
    });
  }

  return { base64, mimeType };
}

/** Strips markdown fences or stray prose and parses the JSON object. */
function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to a bracket-matched slice.
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // Fall through to the error below.
    }
  }

  throw new AppError('INVALID_JSON', 'Gemini returned a response that was not valid JSON.', {
    detail: 'This occasionally happens. Please try analyzing the image again.',
    retryable: true,
  });
}

function formatZodIssues(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string {
  return issues
    .slice(0, 4)
    .map((issue) => `${issue.path.map(String).join('.') || 'response'}: ${issue.message}`)
    .join('; ');
}

/**
 * One Gemini round-trip for a single model, parsed and validated, with retries
 * for transient failures. Parsing and validation live inside the retry loop on
 * purpose: a malformed reply is just as transient as a 503, and asking again
 * usually fixes it.
 */
async function requestAnalysis(
  model: string,
  base64: string,
  mimeType: string,
): Promise<ImageAnalysis> {
  const client = getClient();

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: base64 } }, { text: USER_PROMPT }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // A low temperature keeps counts stable across runs of the same image.
          temperature: 0.15,
          candidateCount: 1,
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      });

      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        throw new AppError('SAFETY_BLOCKED', 'Gemini declined to analyze this image.', {
          detail: `The request was blocked (${String(blockReason)}). Try a different image.`,
          retryable: false,
        });
      }

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && !['STOP', 'MAX_TOKENS'].includes(String(finishReason))) {
        throw new AppError('SAFETY_BLOCKED', 'Gemini stopped before finishing the analysis.', {
          detail: `Reason reported by the model: ${String(finishReason)}.`,
          retryable: false,
        });
      }

      const text = response.text;
      if (!text || !text.trim()) {
        throw new AppError('EMPTY_RESPONSE', 'Gemini returned an empty response.', {
          detail: 'Please try again.',
          retryable: true,
        });
      }

      const parsed = imageAnalysisSchema.safeParse(extractJson(text));
      if (!parsed.success) {
        throw new AppError('VALIDATION_FAILED', 'Gemini returned data in an unexpected shape.', {
          detail: formatZodIssues(parsed.error.issues),
          retryable: true,
        });
      }

      return parsed.data;
    } catch (error) {
      const normalized = toAnalysisError(error);
      const canRetry =
        normalized.retryable && normalized.code !== 'TIMEOUT' && attempt < MAX_RETRIES;

      if (!canRetry) throw error;

      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

/**
 * The model that last succeeded for this key. Once the preferred model has
 * returned 404 there is no point paying that round-trip on every analysis, so
 * subsequent requests start from the model that actually works.
 */
let resolvedModel: { key: string; model: string } | null = null;

/** Which model actually answered the last successful request (for the status UI). */
export function getResolvedModel(): string | null {
  return resolvedModel?.model ?? null;
}

/**
 * Analyzes an image and returns a validated, normalised result.
 *
 * If the configured model is not available for the supplied key, the known
 * fallback models are tried in order before giving up.
 */
export async function analyzeImage(request: AnalyzeImageRequest): Promise<AnalyzeResult> {
  const { base64, mimeType } = validateRequest(request);

  const apiKey = getApiKey() ?? '';
  const primary = getModelName();
  const chain = [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)];

  // Skip candidates already known to be unavailable for this key.
  const startIndex =
    resolvedModel?.key === apiKey ? Math.max(0, chain.indexOf(resolvedModel.model)) : 0;
  const candidates = chain.slice(startIndex);

  const startedAt = Date.now();
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const model = candidates[index];

    try {
      const analysis = await requestAnalysis(model, base64, mimeType);
      resolvedModel = { key: apiKey, model };

      return {
        data: normalizeAnalysis(analysis),
        model,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      // Only a genuinely unavailable model justifies falling back; every other
      // failure would fail identically on the next model.
      const isLastCandidate = index === candidates.length - 1;
      if (isLastCandidate || toAnalysisError(error).code !== 'MODEL_UNAVAILABLE') {
        throw error;
      }

      console.warn(`[gemini] model ${model} is unavailable for this key; trying ${candidates[index + 1]}`);
    }
  }

  throw lastError ?? new AppError('UNKNOWN', 'Image analysis failed.', { retryable: true });
}
