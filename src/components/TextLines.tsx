import { CollapsibleCard } from './CollapsibleCard';
import { CopyButton } from './CopyButton';
import { TextLinesIcon } from './icons';

interface TextLinesProps {
  lines: string[];
}

/** Every legible line of text found in the image, in reading order. */
export function TextLines({ lines }: TextLinesProps) {
  return (
    <CollapsibleCard
      title="Text in the image"
      subtitle={`${lines.length} ${lines.length === 1 ? 'line' : 'lines'} transcribed`}
      icon={<TextLinesIcon className="h-5 w-5" />}
      actions={<CopyButton text={() => lines.join('\n')} label="Copy text" />}
    >
      <ol className="max-h-72 overflow-y-auto rounded-xl border border-line bg-canvas/60 font-mono text-[13px] leading-relaxed">
        {lines.map((line, index) => (
          <li
            key={`${index}-${line.slice(0, 16)}`}
            className="flex gap-3 border-b border-line/60 px-3.5 py-1.5 last:border-b-0"
          >
            <span className="w-6 shrink-0 select-none text-right text-ink-3">{index + 1}</span>
            <span className="min-w-0 break-words text-ink">{line}</span>
          </li>
        ))}
      </ol>
    </CollapsibleCard>
  );
}
