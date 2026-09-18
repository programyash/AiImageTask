/**
 * Client-side image validation and preparation.
 *
 * A raw phone photo can easily be 10-15 MB, which is slow to send and wasteful
 * to analyze: Gemini reduces large images internally anyway. Downscaling the
 * longest edge to 2048px and re-encoding as JPEG keeps enough detail for
 * object recognition, facial expressions and small printed text (document
 * fields) while cutting the payload by an order of magnitude.
 *
 * This happens in the renderer with the Canvas API rather than in the main
 * process, deliberately: it avoids a native image dependency (sharp), which
 * would otherwise complicate `electron-builder` packaging for no benefit.
 */
import {
  MAX_IMAGE_DIMENSION,
  MAX_SOURCE_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  type AnalysisError,
} from '@shared/ipc';

export interface PreparedImage {
  /** Base64 image bytes, no `data:` prefix. Sent to the main process. */
  base64: string;
  mimeType: string;
  fileName: string;
  /** Object URL for the on-screen preview. Must be revoked by the caller. */
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  /** Size of the payload actually sent, after any downscaling. */
  uploadBytes: number;
  wasDownscaled: boolean;
}

/** A validation/preparation failure, in the same shape as main-process errors. */
export class ImageError extends Error {
  readonly analysisError: AnalysisError;

  constructor(analysisError: AnalysisError) {
    super(analysisError.message);
    this.name = 'ImageError';
    this.analysisError = analysisError;
  }
}

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Human-readable file size, e.g. "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resolves the MIME type. `file.type` is empty for some drag-and-drop sources,
 * so the extension is used as a fallback.
 */
function resolveMimeType(file: File): string | null {
  const declared = file.type?.toLowerCase().trim();
  if (declared && (SUPPORTED_MIME_TYPES as readonly string[]).includes(declared)) {
    return declared;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TO_MIME[extension] ?? null;
}

/**
 * Checks type and size before any decoding work happens. Returns the resolved
 * MIME type, or throws an `ImageError` the UI can render directly.
 */
export function validateImageFile(file: File): string {
  const mimeType = resolveMimeType(file);

  if (!mimeType) {
    throw new ImageError({
      code: 'UNSUPPORTED_TYPE',
      message: `"${file.name}" is not a supported image.`,
      detail: `Choose a ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()} file.`,
      retryable: false,
    });
  }

  if (file.size === 0) {
    throw new ImageError({
      code: 'NO_IMAGE',
      message: `"${file.name}" is empty.`,
      detail: 'The file contains no data. Try a different image.',
      retryable: false,
    });
  }

  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new ImageError({
      code: 'IMAGE_TOO_LARGE',
      message: `"${file.name}" is too large (${formatBytes(file.size)}).`,
      detail: `The maximum file size is ${formatBytes(MAX_SOURCE_FILE_BYTES)}.`,
      retryable: false,
    });
  }

  return mimeType;
}

/** Reads a Blob as base64 without the `data:` prefix. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(
        new ImageError({
          code: 'NO_IMAGE',
          message: 'The image could not be read.',
          detail: 'The file may be corrupt or locked by another program.',
          retryable: false,
        }),
      );

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(
          new ImageError({
            code: 'NO_IMAGE',
            message: 'The image could not be read.',
            retryable: false,
          }),
        );
        return;
      }

      const separator = result.indexOf(',');
      resolve(separator === -1 ? result : result.slice(separator + 1));
    };

    reader.readAsDataURL(blob);
  });
}

/** Decodes the file, honouring EXIF orientation so rotated photos analyze correctly. */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError({
      code: 'UNSUPPORTED_TYPE',
      message: `"${file.name}" could not be opened as an image.`,
      detail: 'The file may be corrupt, or its contents may not match its extension.',
      retryable: false,
    });
  }
}

function drawToBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageError({
      code: 'UNKNOWN',
      message: 'This system could not prepare the image for analysis.',
      detail: 'The 2D canvas context was unavailable.',
      retryable: true,
    });
  }

  // PNG/WEBP transparency becomes white rather than black, which reads far
  // better to the model than a black silhouette.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new ImageError({
              code: 'UNKNOWN',
              message: 'This system could not compress the image for analysis.',
              retryable: true,
            }),
          );
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Validates, decodes, optionally downscales, and base64-encodes an image ready
 * for IPC. Throws `ImageError` with a user-facing message on any failure.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const mimeType = validateImageFile(file);
  const bitmap = await decode(file);

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const needsResize = longestEdge > MAX_IMAGE_DIMENSION;
    // Even an in-spec image gets re-encoded if it would still be a big upload.
    const needsRecompress = file.size > MAX_UPLOAD_BYTES / 2;

    let payload: Blob = file;
    let payloadMime = mimeType;
    let width = bitmap.width;
    let height = bitmap.height;
    let wasDownscaled = false;

    if (needsResize || needsRecompress) {
      const scale = needsResize ? MAX_IMAGE_DIMENSION / longestEdge : 1;
      width = Math.max(1, Math.round(bitmap.width * scale));
      height = Math.max(1, Math.round(bitmap.height * scale));

      // Step the quality down until the payload comfortably fits the IPC cap.
      // Three attempts is enough for any realistic photograph.
      // Start at high quality: small printed text (ID cards, receipts) is the
      // first thing to suffer from JPEG artefacts.
      let encoded = await drawToBlob(bitmap, width, height, 0.9);
      for (const quality of [0.78, 0.62]) {
        if (encoded.size <= MAX_UPLOAD_BYTES) break;
        encoded = await drawToBlob(bitmap, width, height, quality);
      }

      // Only keep the re-encoded version if it actually helped.
      if (needsResize || encoded.size < file.size) {
        payload = encoded;
        payloadMime = 'image/jpeg';
        wasDownscaled = true;
      } else {
        width = bitmap.width;
        height = bitmap.height;
      }
    }

    if (payload.size > MAX_UPLOAD_BYTES) {
      throw new ImageError({
        code: 'IMAGE_TOO_LARGE',
        message: `"${file.name}" is too large to analyze.`,
        detail: `Even after compression it is ${formatBytes(payload.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
        retryable: false,
      });
    }

    return {
      base64: await blobToBase64(payload),
      mimeType: payloadMime,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      width,
      height,
      originalBytes: file.size,
      uploadBytes: payload.size,
      wasDownscaled,
    };
  } finally {
    bitmap.close();
  }
}
