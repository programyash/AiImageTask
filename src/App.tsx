import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar, type View } from '@/components/Sidebar';
import { Home } from '@/pages/Home';
import { fetchStatus } from '@/services/analyzer';
import type { AppStatus } from '@/types/analysis';
import type { HistoryEntry } from '@/types/history';

// The History view is code-split; it is never needed for the first paint.
const History = lazy(() => import('@/pages/History'));

/** Most recent analyses kept in memory for the History view. */
const MAX_HISTORY = 30;

function ViewFallback() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-700" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('analyze');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const refreshStatus = useCallback(() => {
    void fetchStatus().then(setStatus);
  }, []);

  useEffect(refreshStatus, [refreshStatus]);

  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory((previous) => [entry, ...previous].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      <Sidebar active={view} onNavigate={setView} historyCount={history.length} />

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <ErrorBoundary>
          {/*
            The Analyze view stays mounted while History is shown so a selected
            image, an in-flight request and its result all survive the trip.
          */}
          <div hidden={view !== 'analyze'} className="h-full">
            <Home status={status} onStatusChange={refreshStatus} onAnalyzed={addToHistory} />
          </div>

          {view === 'history' && (
            <Suspense fallback={<ViewFallback />}>
              <History entries={history} onClear={clearHistory} onAnalyzeNew={() => setView('analyze')} />
            </Suspense>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
