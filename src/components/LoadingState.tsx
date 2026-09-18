interface LoadingStateProps {
  title?: string;
  message?: string;
  /** Single-line inline variant used under the upload area. */
  compact?: boolean;
}

function Spinner({ size }: { size: 'sm' | 'lg' }) {
  const dimension = size === 'lg' ? 'h-12 w-12 border-[3px]' : 'h-5 w-5 border-2';
  return (
    <span className={`relative block ${dimension} rounded-full`} aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-[inherit] border-line" />
      <span className="absolute inset-0 animate-spin rounded-full border-[inherit] border-transparent border-t-brand-700" />
    </span>
  );
}

/** Spinner + copy shown while the image is being prepared or analyzed. */
export function LoadingState({
  title = 'Analyzing image…',
  message = 'Identifying objects, people and visible expressions',
  compact = false,
}: LoadingStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-muted/70 px-4 py-3 text-sm" role="status" aria-live="polite">
        <Spinner size="sm" />
        <span className="font-medium text-ink">{title}</span>
        <span className="text-ink-2">· {message}</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-canvas/60 px-6 py-16 text-center animate-fade-up"
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <p className="mt-5 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-2">{message}</p>
    </div>
  );
}
