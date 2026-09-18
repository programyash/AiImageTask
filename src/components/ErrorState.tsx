import type { AnalysisError } from '@/types/analysis';
import { AlertIcon, KeyIcon, ResetIcon } from './icons';

interface ErrorStateProps {
  error: AnalysisError;
  /** Shown only when the error is retryable and a retry makes sense. */
  onRetry?: () => void;
  onDismiss?: () => void;
}

const CONFIGURATION_CODES = new Set<AnalysisError['code']>(['MISSING_API_KEY', 'INVALID_API_KEY']);
const CONNECTIVITY_CODES = new Set<AnalysisError['code']>(['NETWORK_ERROR', 'TIMEOUT', 'API_ERROR', 'RATE_LIMITED']);

/** Calm, human-readable failure card. Copy comes from the typed error, never a raw exception. */
export function ErrorState({ error, onRetry, onDismiss }: ErrorStateProps) {
  const isConfiguration = CONFIGURATION_CODES.has(error.code);
  const isConnectivity = CONNECTIVITY_CODES.has(error.code);

  const title = isConfiguration ? 'Setup needed before analyzing' : "Analysis couldn't be completed";
  const hint = isConnectivity ? 'Please check your connection and try again.' : error.detail;

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-canvas/60 px-6 py-12 text-center animate-fade-up"
      role="alert"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          isConfiguration ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
        }`}
        aria-hidden="true"
      >
        {isConfiguration ? <KeyIcon className="h-6 w-6" /> : <AlertIcon className="h-6 w-6" />}
      </span>

      <p className="mt-5 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink">{error.message}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-2">{hint}</p>}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onRetry && error.retryable && (
          <button type="button" className="btn-primary" onClick={onRetry}>
            <ResetIcon className="h-4 w-4" />
            Try Again
          </button>
        )}
        {onDismiss && (
          <button type="button" className="btn-secondary" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>

      <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-ink-3">{error.code}</p>
    </div>
  );
}
