'use client';

import { useState } from 'react';

/**
 * Tag/chip multi-entry field. Type a value and press Enter or comma to add it as
 * a removable chip; Backspace on an empty input removes the last chip. Optional
 * `suggestions` render as one-tap "+ Add" buttons (already-added ones are hidden).
 * Free-text is the workhorse — suggestions are just a convenience starter set.
 */
export function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  max,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
}) {
  const [draft, setDraft] = useState('');

  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());

  function add(raw: string) {
    const v = raw.trim().replace(/,$/, '').trim();
    setDraft('');
    if (!v || has(v)) return;
    if (max && values.length >= max) return;
    onChange([...values, v]);
  }

  function removeAt(i: number) {
    onChange(values.filter((_, x) => x !== i));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length > 0) {
      removeAt(values.length - 1);
    }
  }

  const atMax = max != null && values.length >= max;
  const remaining = suggestions.filter((s) => !has(s));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-white p-2 focus-within:border-primary-400">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-pill bg-primary-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary-700"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => removeAt(i)}
              className="flex h-4 w-4 items-center justify-center rounded-full text-primary-400 hover:bg-primary-100 hover:text-primary-700"
            >
              ×
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
            placeholder={values.length === 0 ? placeholder : 'Type and press Enter…'}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-subtle"
          />
        )}
      </div>

      {!atMax && remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.slice(0, 14).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-pill border border-border bg-white px-2.5 py-1 text-xs text-body transition hover:border-primary-400 hover:text-primary-600"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
