import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copies text to the clipboard and reports a short-lived "copied" state for
 * button feedback. Fails silently: the clipboard can be unavailable in some
 * sandboxed contexts, and a copy button that does nothing is better than a
 * crash.
 */
export function useCopy(resetAfterMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
      } catch {
        setCopied(false);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
