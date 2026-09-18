import { formatBytes, type PreparedImage } from '@/lib/imageFile';
import { CloseIcon, ImageIcon } from './icons';

interface ImagePreviewProps {
  image: PreparedImage;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Large preview with a remove button and a file-info overlay. The image keeps
 * its aspect ratio inside a viewport-relative frame so portrait and landscape
 * photos both sit comfortably without pushing the buttons off screen.
 */
export function ImagePreview({ image, onClear, disabled = false }: ImagePreviewProps) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-line animate-fade-scale">
      <div className="flex h-[clamp(280px,48vh,560px)] items-center justify-center bg-[#E9EEEA] p-3">
        <img
          src={image.previewUrl}
          alt={`Preview of ${image.fileName}`}
          className="max-h-full max-w-full rounded-lg object-contain"
          draggable={false}
          decoding="async"
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        aria-label="Remove image"
        title="Remove image"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-950/70 text-white backdrop-blur-sm transition-[background-color,transform] duration-150 hover:bg-brand-950/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-offset-0"
      >
        <CloseIcon className="h-4 w-4" />
      </button>

      <figcaption className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl bg-brand-950/75 px-3 py-2.5 text-white backdrop-blur-sm">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"
          aria-hidden="true"
        >
          <ImageIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold" title={image.fileName}>
            {image.fileName}
          </span>
          <span className="block text-xs text-white/70">
            {image.width} × {image.height}px · {formatBytes(image.originalBytes)}
            {image.wasDownscaled && ` · sent as ${formatBytes(image.uploadBytes)}`}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
