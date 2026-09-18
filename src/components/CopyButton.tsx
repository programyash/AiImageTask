import { useCopy } from '@/lib/useCopy';
import { CheckIcon, CopyIcon } from './icons';

interface CopyButtonProps {
  /** Text to copy, or a function producing it (for large payloads). */
  text: string | (() => string);
  /** Visible label; pass an empty string for an icon-only button. */
  label?: string;
  ariaLabel?: string;
}

/** Small ghost button with "Copied" feedback. */
export function CopyButton({ text, label = 'Copy', ariaLabel }: CopyButtonProps) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      className={`btn-ghost h-8 text-[13px] ${label ? 'px-2.5' : 'w-8 px-0'}`}
      onClick={() => void copy(typeof text === 'function' ? text() : text)}
      aria-label={ariaLabel ?? (label || 'Copy')}
      title={ariaLabel ?? (label || 'Copy')}
      aria-live="polite"
    >
      {copied ? <CheckIcon className="h-4 w-4 text-brand-700" /> : <CopyIcon className="h-4 w-4" />}
      {label && (copied ? 'Copied' : label)}
    </button>
  );
}
