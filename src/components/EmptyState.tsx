import { ImageIcon, SparkleIcon } from './icons';

interface EmptyStateProps {
  hasImage: boolean;
}

/** Placeholder for the results panel before any analysis has run. */
export function EmptyState({ hasImage }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 px-6 py-14 text-center animate-fade-up">
      <div className="relative" aria-hidden="true">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-card text-ink-3 shadow-card">
          <ImageIcon className="h-7 w-7" />
        </span>
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white shadow-button">
          <SparkleIcon className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className="mt-5 text-[15px] font-semibold text-ink">
        {hasImage ? 'Ready when you are' : 'Your analysis will appear here'}
      </p>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-2">
        {hasImage
          ? 'Click "Analyze Image" to identify objects, count people and analyze visible expressions.'
          : 'Upload an image to identify objects, count people and analyze visible expressions.'}
      </p>
    </div>
  );
}
