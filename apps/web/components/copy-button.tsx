'use client';

import { useState } from 'react';
import { cn } from '@ellixr/ui';

/** Copies `value` to the clipboard with brief "Copied" feedback. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard requires a secure context (https/localhost); ignore otherwise */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'shrink-0 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-primary-50',
        copied ? 'text-success' : 'text-primary-600',
        className,
      )}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
