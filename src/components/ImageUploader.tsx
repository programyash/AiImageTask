import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { MAX_SOURCE_FILE_BYTES, SUPPORTED_EXTENSIONS } from '@shared/ipc';
import { formatBytes } from '@/lib/imageFile';
import { FolderIcon, UploadIcon } from './icons';

interface ImageUploaderProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
  /** Shorter layout used once an image is already selected. */
  compact?: boolean;
}

const ACCEPT = SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(',');
const FORMAT_LABEL = 'JPG, PNG, WEBP';

/** Drag-and-drop zone with a "Choose Image" button. Emits the raw File. */
export function ImageUploader({ onSelect, disabled = false, compact = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && !disabled) onSelect(file);
    },
    [disabled, onSelect],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    // Allow re-selecting the same file after a reset.
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (disabled) return;
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    // Ignore leave events fired while moving between child elements.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload an image: click to browse or drag a file here"
      onClick={openFileDialog}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openFileDialog();
        }
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed text-center',
        'transition-[border-color,background-color] duration-200 ease-out',
        compact ? 'gap-2 px-5 py-4' : 'gap-3 px-6 py-9',
        isDragging
          ? 'border-brand-600 bg-brand-50'
          : 'border-brand-200/80 bg-canvas/60 hover:border-brand-500/70 hover:bg-brand-50/60',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleInputChange}
        onClick={(event) => event.stopPropagation()}
        disabled={disabled}
        tabIndex={-1}
      />

      {compact ? (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-2 font-medium text-ink">
            <UploadIcon className="h-4 w-4 text-brand-700" />
            {isDragging ? 'Drop to replace the image' : 'Drop a different image'}
          </span>
          <span className="text-ink-3">or</span>
          <span className="font-semibold text-brand-700 underline-offset-2 group-hover:underline">
            choose another file
          </span>
        </div>
      ) : (
        <>
          <div
            className={[
              'flex h-14 w-14 items-center justify-center rounded-2xl border transition-[transform,background-color,border-color] duration-200',
              isDragging
                ? 'scale-105 border-brand-200 bg-brand-100 text-brand-700'
                : 'border-line bg-card text-ink-2 shadow-card group-hover:-translate-y-0.5 group-hover:text-brand-700',
            ].join(' ')}
            aria-hidden="true"
          >
            <UploadIcon className="h-6 w-6" />
          </div>

          <div>
            <p className="text-[15px] font-semibold text-ink">
              {isDragging ? 'Release to select' : 'Drag & drop an image here'}
            </p>
            <p className="mt-0.5 text-sm text-ink-2">or click to browse</p>
          </div>

          <span className="btn-primary pointer-events-none mt-1 h-11 px-5" aria-hidden="true">
            <FolderIcon className="h-[18px] w-[18px]" />
            Choose Image
          </span>

          <p className="text-xs text-ink-3">
            Supports {FORMAT_LABEL} (max {formatBytes(MAX_SOURCE_FILE_BYTES)})
          </p>
        </>
      )}
    </div>
  );
}
