import type { CSSProperties, ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  caption: string;
  icon: ReactNode;
  /** `accent` = green tint (people), `secondary` = restrained plum tint (happy). */
  tone?: 'accent' | 'secondary';
  /** Optional element rendered beside the number, e.g. a progress ring. */
  aside?: ReactNode;
  /** Optional line under the number, e.g. "Every visible face appears to be smiling". */
  note?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const TONES = {
  accent: 'bg-brand-50 text-brand-700',
  secondary: 'bg-plum-100 text-plum-600',
} as const;

/** Big-number summary tile used for the people / happy counts. */
export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'accent',
  aside,
  note,
  className = '',
  style,
}: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 ${className}`} style={style}>
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <p className="text-sm font-medium text-ink-2">{label}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[36px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{value}</p>
          <p className="mt-2 text-sm text-ink-2">{caption}</p>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      {note && <div className="mt-4">{note}</div>}
    </div>
  );
}
