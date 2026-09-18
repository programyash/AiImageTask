import type { ImageAnalysis, ImageCategory } from '@/types/analysis';
import { SparkleIcon } from './icons';

interface SummaryCardProps {
  analysis: ImageAnalysis;
}

const CATEGORY_LABELS: Record<ImageCategory, string> = {
  photo: 'Photo',
  document: 'Document',
  screenshot: 'Screenshot',
  artwork: 'Artwork',
  diagram: 'Diagram',
  product: 'Product',
  other: 'Image',
};

/** "What this image is": category chip, one-line summary, and tags. */
export function SummaryCard({ analysis }: SummaryCardProps) {
  const { summary, category, tags } = analysis;
  if (!summary && !category && !tags?.length) return null;

  return (
    <section className="rounded-2xl border border-brand-200/70 bg-brand-50/60 p-5" aria-label="Summary">
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-button"
          aria-hidden="true"
        >
          <SparkleIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-ink">What this is</p>
            {category && (
              <span className="rounded-full border border-brand-200 bg-card px-2.5 py-0.5 text-[12px] font-semibold text-brand-700">
                {CATEGORY_LABELS[category]}
              </span>
            )}
          </div>

          {summary && <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{summary}</p>}

          {tags && tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg border border-line bg-card px-2 py-0.5 text-[12px] font-medium text-ink-2"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
