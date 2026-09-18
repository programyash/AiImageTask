import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ChevronIcon, ClockIcon, ImageIcon, SmileIcon, UsersIcon } from '@/components/icons';
import type { HistoryEntry } from '@/types/history';

interface HistoryProps {
  entries: HistoryEntry[];
  onClear: () => void;
  onAnalyzeNew: () => void;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const detailId = `history-${entry.id}`;

  return (
    <li className="card overflow-hidden animate-fade-up">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors duration-150 hover:bg-canvas/70"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-ink-3">
          {entry.thumbnail ? (
            <img src={entry.thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{entry.fileName}</span>
          <span className="mt-0.5 block text-sm text-ink-2">
            {timeFormatter.format(entry.analyzedAt)} · {entry.width} × {entry.height}px · {entry.model}
          </span>
        </span>

        <span className="hidden items-center gap-5 text-sm sm:flex">
          <span className="flex items-center gap-1.5 text-ink" title="People">
            <UsersIcon className="h-4 w-4 text-ink-2" />
            <span className="font-semibold tabular-nums">{entry.analysis.people_count}</span>
          </span>
          <span className="flex items-center gap-1.5 text-ink" title="Appearing happy">
            <SmileIcon className="h-4 w-4 text-ink-2" />
            <span className="font-semibold tabular-nums">{entry.analysis.happy_people_count}</span>
          </span>
          <span className="text-ink-2">
            {entry.analysis.objects.length} {entry.analysis.objects.length === 1 ? 'object' : 'objects'}
          </span>
        </span>

        <ChevronIcon
          className={`h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div id={detailId} className="border-t border-line bg-canvas/60 px-4 py-4">
          {entry.analysis.summary && <p className="mb-3 text-sm text-ink">{entry.analysis.summary}</p>}
          {entry.analysis.document?.type && (
            <p className="mb-3 text-sm text-ink-2">
              Document: <span className="font-medium text-ink">{entry.analysis.document.type}</span>
              {entry.analysis.document.fields?.length
                ? ` · ${entry.analysis.document.fields.length} fields read`
                : ''}
            </p>
          )}
          {entry.analysis.objects.length === 0 ? (
            <p className="text-sm text-ink-2">No distinct objects were identified.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Detected objects">
              {entry.analysis.objects.map((object) => (
                <li
                  key={object.name}
                  className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm"
                >
                  <span className="font-medium text-ink">{capitalize(object.name)}</span>
                  <span className="rounded-md bg-brand-50 px-1.5 text-xs font-semibold tabular-nums text-brand-700">
                    {object.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-3">Analyzed in {(entry.durationMs / 1000).toFixed(1)}s.</p>
        </div>
      )}
    </li>
  );
}

/** Analyses from this session, newest first. Nothing is persisted to disk. */
export default function History({ entries, onClear, onAnalyzeNew }: HistoryProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col gap-5 p-5 lg:p-6 2xl:p-8">
      <PageHeader
        title="History"
        subtitle="Images analyzed in this session. History is cleared when the app closes."
        actions={
          entries.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={onClear}>
              Clear history
            </button>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <div className="card flex flex-1 flex-col items-center justify-center px-6 py-16 text-center animate-fade-up">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-ink-3" aria-hidden="true">
            <ClockIcon className="h-7 w-7" />
          </span>
          <p className="mt-5 text-[15px] font-semibold text-ink">Nothing analyzed yet</p>
          <p className="mt-1 max-w-xs text-sm text-ink-2">
            Results from each image you analyze will be listed here for the rest of this session.
          </p>
          <button type="button" className="btn-primary mt-6" onClick={onAnalyzeNew}>
            Analyze an image
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Analysis history">
          {entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
