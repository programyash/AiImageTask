import { memo, useState } from 'react';
import type { DetectedObject } from '@/types/analysis';
import { CubeIcon, GridIcon, ListIcon, ObjectGlyph } from './icons';

interface ObjectListProps {
  objects: DetectedObject[];
}

type Layout = 'list' | 'grid';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function LayoutToggle({ layout, onChange }: { layout: Layout; onChange: (layout: Layout) => void }) {
  const options: Array<{ id: Layout; label: string; icon: typeof ListIcon }> = [
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'grid', label: 'Grid', icon: GridIcon },
  ];

  return (
    <div className="flex rounded-xl bg-muted p-1" role="group" aria-label="Object layout">
      {options.map(({ id, label, icon: Icon }) => {
        const isActive = id === layout;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            className={[
              'flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150',
              isActive ? 'bg-brand-950 text-white shadow-button' : 'text-ink-2 hover:text-ink',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Aggregated object table with proportional bars. Memoised because the parent
 * re-renders whenever the model badge refreshes, while this list only depends
 * on the analysis itself.
 */
export const ObjectList = memo(function ObjectList({ objects }: ObjectListProps) {
  const [layout, setLayout] = useState<Layout>('list');

  const totalInstances = objects.reduce((sum, object) => sum + object.count, 0);
  const maxCount = objects.length ? Math.max(...objects.map((object) => object.count)) : 1;

  return (
    <section className="rounded-2xl border border-line bg-card" aria-labelledby="objects-heading">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
            aria-hidden="true"
          >
            <CubeIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 id="objects-heading" className="text-[15px] font-semibold text-ink">
              Objects Detected
            </h3>
            <p className="truncate text-sm text-ink-2">
              {objects.length} different {objects.length === 1 ? 'type' : 'types'} · {totalInstances} total{' '}
              {totalInstances === 1 ? 'instance' : 'instances'}
            </p>
          </div>
        </div>
        {objects.length > 0 && (
          <div className="shrink-0">
            <LayoutToggle layout={layout} onChange={setLayout} />
          </div>
        )}
      </header>

      {objects.length === 0 ? (
        <p className="m-5 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">
          No distinct objects were identified in this image.
        </p>
      ) : layout === 'list' ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 text-left">
                <th scope="col" className="eyebrow px-5 py-2.5 font-semibold">
                  Object
                </th>
                <th scope="col" className="eyebrow w-16 px-3 py-2.5 text-right font-semibold">
                  Count
                </th>
                <th scope="col" className="eyebrow w-[22%] px-5 py-2.5 font-semibold">
                  Visual
                </th>
              </tr>
            </thead>
            <tbody>
              {objects.map((object, index) => (
                <tr
                  key={object.name}
                  className="border-t border-line/70 animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                >
                  <td className="px-5 py-3 align-top">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 text-ink-2" aria-hidden="true">
                        <ObjectGlyph name={object.name} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{capitalize(object.name)}</span>
                        {object.description && (
                          <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
                            {object.description}
                          </span>
                        )}
                        {object.attributes && object.attributes.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1" aria-label="Attributes">
                            {object.attributes.map((attribute) => (
                              <span
                                key={attribute}
                                className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-2"
                              >
                                {attribute}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right align-top font-semibold tabular-nums text-ink">
                    {object.count}
                  </td>
                  <td className="px-5 py-3 align-top">
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className="h-full origin-left rounded-full bg-brand-700 animate-bar-grow"
                        style={{
                          width: `${Math.max(4, Math.round((object.count / maxCount) * 100))}%`,
                          animationDelay: `${Math.min(index, 8) * 35 + 80}ms`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3" aria-label="Detected objects">
          {objects.map((object, index) => (
            <li
              key={object.name}
              className="flex items-start gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-3 animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-brand-700 shadow-card"
                aria-hidden="true"
              >
                <ObjectGlyph name={object.name} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">{capitalize(object.name)}</span>
                  <span className="rounded-md bg-brand-50 px-1.5 text-xs font-semibold tabular-nums text-brand-700">
                    {object.count}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-2">
                  {object.description ?? `${object.count} ${object.count === 1 ? 'instance' : 'instances'}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
