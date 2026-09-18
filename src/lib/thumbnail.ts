/**
 * Builds a small JPEG data-URL thumbnail from an already-loaded preview URL.
 *
 * Used for the session history list, which outlives the preview's object URL
 * (that is revoked when the image is cleared). A 96px thumbnail is a few KB,
 * so keeping a handful in memory costs nothing noticeable.
 */
const THUMBNAIL_SIZE = 96;

export function createThumbnail(sourceUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const scale = THUMBNAIL_SIZE / Math.max(image.naturalWidth, image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = sourceUrl;
  });
}
