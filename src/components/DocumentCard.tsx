import type { DocumentInfo } from '@/types/analysis';
import { CopyButton } from './CopyButton';
import { IdCardIcon, InfoIcon } from './icons';

interface DocumentCardProps {
  document: DocumentInfo;
}

function fieldsAsText(document: DocumentInfo): string {
  const lines: string[] = [];
  if (document.type) lines.push(`Document: ${document.type}`);
  if (document.issuer) lines.push(`Issuer: ${document.issuer}`);
  for (const field of document.fields ?? []) lines.push(`${field.label}: ${field.value}`);
  if (document.notes) lines.push(`Notes: ${document.notes}`);
  return lines.join('\n');
}

/** Extracted document / ID details, transcribed from the image. */
export function DocumentCard({ document }: DocumentCardProps) {
  const fields = document.fields ?? [];

  return (
    <section className="rounded-2xl border border-line bg-card" aria-labelledby="document-heading">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
            aria-hidden="true"
          >
            <IdCardIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="document-heading" className="text-[15px] font-semibold text-ink">
              {document.type ? document.type : 'Document details'}
            </h3>
            <p className="truncate text-sm text-ink-2">
              {document.issuer ? `Issued by ${document.issuer}` : `${fields.length} ${fields.length === 1 ? 'field' : 'fields'} read from the image`}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <CopyButton text={() => fieldsAsText(document)} label="Copy all" />
        </div>
      </header>

      {fields.length > 0 ? (
        <dl className="mt-4 divide-y divide-line/70 border-t border-line/70">
          {fields.map((field, index) => (
            <div
              key={`${field.label}-${index}`}
              className="group grid grid-cols-[minmax(120px,38%)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
            >
              <dt className="text-sm text-ink-2">{field.label}</dt>
              <dd className="min-w-0 break-words text-sm font-medium text-ink">{field.value}</dd>
              <dd className="opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                <CopyButton text={field.value} label="" ariaLabel={`Copy ${field.label}`} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-5 rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-2">
          No individual fields could be read from this document.
        </p>
      )}

      {document.notes && (
        <p className="mx-5 mb-4 mt-3 rounded-xl bg-muted/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {document.notes}
        </p>
      )}

      <p className="flex items-start gap-2 border-t border-line/70 px-5 py-3 text-xs leading-relaxed text-ink-3">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Values are transcribed from the image as printed; a &ldquo;?&rdquo; marks a character that could not be
        read. This image may contain personal information - it was sent to Gemini for analysis and is not stored by
        this app.
      </p>
    </section>
  );
}
