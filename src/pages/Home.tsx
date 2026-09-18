import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalysisResults } from '@/components/AnalysisResults';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ImagePreview } from '@/components/ImagePreview';
import { ImageUploader } from '@/components/ImageUploader';
import { LoadingState } from '@/components/LoadingState';
import { ModelBadge } from '@/components/ModelBadge';
import { KeyIcon, ResetIcon, SparkleIcon } from '@/components/icons';
import type { PreparedImage } from '@/lib/imageFile';
import { createThumbnail } from '@/lib/thumbnail';
import { analyzePreparedImage, prepareForAnalysis } from '@/services/analyzer';
import type { AnalysisError, AppStatus, ImageAnalysis } from '@/types/analysis';
import type { HistoryEntry } from '@/types/history';

type Phase = 'idle' | 'preparing' | 'ready' | 'analyzing';

interface CompletedAnalysis {
  data: ImageAnalysis;
  model: string;
  durationMs: number;
}

interface HomeProps {
  status: AppStatus | null;
  /** Called after a successful analysis so the model badge can refresh. */
  onStatusChange: () => void;
  onAnalyzed: (entry: HistoryEntry) => void;
}

/** The Analyze view: input on the left, results on the right. */
export function Home({ status, onStatusChange, onAnalyzed }: HomeProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [result, setResult] = useState<CompletedAnalysis | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);

  // Guards against a stale async result landing after the user hit Reset or
  // picked a different image mid-flight.
  const requestToken = useRef(0);

  // Object URLs are not garbage-collected; release the previous preview.
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  const handleClear = useCallback(() => {
    requestToken.current += 1;
    setImage(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  }, []);

  const handleSelect = useCallback(async (file: File) => {
    const token = ++requestToken.current;
    setError(null);
    setResult(null);
    setImage(null);
    setPhase('preparing');

    const prepared = await prepareForAnalysis(file);
    if (token !== requestToken.current) {
      if (prepared.ok) URL.revokeObjectURL(prepared.image.previewUrl);
      return;
    }

    if (!prepared.ok) {
      setError(prepared.error);
      setPhase('idle');
      return;
    }

    setImage(prepared.image);
    setPhase('ready');
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!image) return;

    const token = ++requestToken.current;
    setError(null);
    setResult(null);
    setPhase('analyzing');

    const response = await analyzePreparedImage(image);
    if (token !== requestToken.current) return;

    if (response.ok) {
      setResult({ data: response.data, model: response.model, durationMs: response.durationMs });
      onStatusChange();

      const analyzedAt = Date.now();
      void createThumbnail(image.previewUrl).then((thumbnail) => {
        onAnalyzed({
          id: `${analyzedAt}-${image.fileName}`,
          fileName: image.fileName,
          width: image.width,
          height: image.height,
          thumbnail,
          analysis: response.data,
          model: response.model,
          durationMs: response.durationMs,
          analyzedAt,
        });
      });
    } else {
      setError(response.error);
    }
    setPhase('ready');
  }, [image, onAnalyzed, onStatusChange]);

  const isBusy = phase === 'preparing' || phase === 'analyzing';
  const missingKey = status !== null && !status.hasApiKey;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-5 p-5 lg:p-6 2xl:p-8">
      {missingKey && (
        <div
          className="card flex items-start gap-3 border-amber-200 bg-amber-50/70 px-4 py-3.5 text-sm animate-fade-up"
          role="status"
        >
          <span className="mt-0.5 text-amber-600" aria-hidden="true">
            <KeyIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">No Gemini API key configured</p>
            <p className="mt-0.5 text-ink-2">
              Add <code className="rounded bg-white px-1 py-0.5 font-mono text-xs text-ink">GEMINI_API_KEY=your_key</code> to a{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-xs text-ink">.env</code> file
              {status?.isPackaged ? ' next to the application executable' : ' in the project folder'}, then restart the
              app. Get a key at aistudio.google.com/apikey.
            </p>
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* Left: input                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="card flex flex-col p-5 animate-fade-up lg:sticky lg:top-0 lg:self-start lg:p-6"
          aria-labelledby="analyze-heading"
        >
          <header>
            <h1 id="analyze-heading" className="section-title">
              Analyze an Image
            </h1>
            <p className="section-subtitle">Upload a photo and let AI identify objects, people and expressions</p>
          </header>

          <div className="mt-5">
            <ImageUploader onSelect={handleSelect} disabled={isBusy} compact={image !== null} />
          </div>

          {phase === 'preparing' && (
            <div className="mt-4">
              <LoadingState title="Preparing image" message="Decoding and resizing for analysis" compact />
            </div>
          )}

          {image && (
            <div className="mt-4">
              <ImagePreview image={image} onClear={handleClear} disabled={isBusy} />
            </div>
          )}

          <div className="mt-5 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3">
            <button
              type="button"
              className="btn-primary h-12 text-[15px]"
              onClick={handleAnalyze}
              disabled={!image || isBusy}
              aria-busy={phase === 'analyzing'}
            >
              {phase === 'analyzing' ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden="true"
                  />
                  Analyzing…
                </>
              ) : (
                <>
                  <SparkleIcon className="h-[18px] w-[18px]" />
                  Analyze Image
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary h-12 text-[15px]"
              onClick={handleClear}
              disabled={isBusy || (!image && !result && !error)}
            >
              <ResetIcon className="h-[18px] w-[18px]" />
              Reset
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Right: output                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="card flex flex-col p-5 animate-fade-up [animation-delay:60ms] lg:p-6"
          aria-labelledby="results-heading"
          aria-live="polite"
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="results-heading" className="section-title">
                Analysis Results
              </h2>
              <p className="section-subtitle">
                {result
                  ? "Here's what we found in your image"
                  : phase === 'analyzing'
                    ? 'Working on it…'
                    : 'Results will appear here after analysis'}
              </p>
            </div>
            {status && <ModelBadge model={result?.model ?? status.model} ready={status.hasApiKey} />}
          </header>

          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            {phase === 'analyzing' ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                error={error}
                onRetry={image && error.retryable ? handleAnalyze : undefined}
                onDismiss={() => setError(null)}
              />
            ) : result ? (
              <AnalysisResults analysis={result.data} model={result.model} durationMs={result.durationMs} />
            ) : (
              <EmptyState hasImage={image !== null} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
