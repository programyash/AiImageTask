import { useId, useState, type ReactNode } from 'react';
import { ChevronIcon } from './icons';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  /** Rendered in the header, right of the title (e.g. a copy button). */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** Card with a toggle header, used for the optional depth sections. */
export function CollapsibleCard({
  title,
  subtitle,
  icon,
  actions,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className={`rounded-2xl border border-line bg-card ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{title}</span>
            {subtitle && <span className="block truncate text-sm text-ink-2">{subtitle}</span>}
          </span>
          <ChevronIcon
            className={`h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
        </button>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {open && (
        <div id={bodyId} className="border-t border-line/70 px-5 py-4 animate-fade-up">
          {children}
        </div>
      )}
    </section>
  );
}
