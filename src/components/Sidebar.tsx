import type { ReactNode } from 'react';
import { ClockIcon, ImageIcon, LeafIcon, LogoIcon } from './icons';

export type View = 'analyze' | 'history';

interface NavItem {
  id: View;
  label: string;
  icon: ReactNode;
  /** Small count shown next to the label, e.g. number of history entries. */
  badge?: number;
}

interface SidebarProps {
  active: View;
  onNavigate: (view: View) => void;
  historyCount: number;
}

/**
 * Slim dark-green navigation rail. Collapses to icons only below the `lg`
 * breakpoint so the workspace keeps its two-column layout in small windows.
 */
export function Sidebar({ active, onNavigate, historyCount }: SidebarProps) {
  const items: NavItem[] = [
    { id: 'analyze', label: 'Analyze', icon: <ImageIcon className="h-5 w-5" /> },
    {
      id: 'history',
      label: 'History',
      icon: <ClockIcon className="h-5 w-5" />,
      badge: historyCount || undefined,
    },
  ];

  return (
    <aside className="flex h-full w-[72px] shrink-0 flex-col bg-brand-950 text-white lg:w-[248px]">
      <div className="flex items-center gap-3 px-4 pb-6 pt-6 lg:px-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white"
          aria-hidden="true"
        >
          <LogoIcon className="h-[22px] w-[22px]" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-[15px] font-semibold leading-tight">AI Image Analyzer</p>
          <p className="truncate text-xs text-white/55">See more in every image</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={[
                'group flex h-11 items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium transition-colors duration-150',
                'focus-visible:ring-offset-brand-950',
                isActive
                  ? 'bg-white/[0.09] text-white'
                  : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                'justify-center lg:justify-start',
              ].join(' ')}
            >
              <span
                className={[
                  'shrink-0 transition-transform duration-150',
                  isActive ? 'text-brand-200' : 'group-hover:translate-x-px',
                ].join(' ')}
              >
                {item.icon}
              </span>
              <span className="hidden flex-1 truncate lg:inline">{item.label}</span>
              {item.badge !== undefined && (
                <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white/80 lg:inline">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden px-4 pb-5 lg:block">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700/60 text-brand-100"
              aria-hidden="true"
            >
              <LeafIcon className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-semibold leading-tight">
              AI for a
              <br />
              clearer world
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            Understand images. Discover more.
          </p>
        </div>
      </div>
    </aside>
  );
}
