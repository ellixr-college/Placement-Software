'use client';

import { Card } from '@ellixr/ui';

export interface BatchCardItem {
  key: string;
  title: string;
  /** Small stat lines shown under the title, e.g. "42 students". */
  stats: { label: string; value: string | number; tint?: 'default' | 'success' | 'warn' }[];
}

/** Responsive grid of clickable cohort cards. Used by the Students, Internships
 * and Alumni officer screens to drill from a batch into its table. */
export function BatchCards({
  items,
  onSelect,
}: {
  items: BatchCardItem[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((b) => (
        <button key={b.key} onClick={() => onSelect(b.key)} className="text-left">
          <Card className="flex h-full flex-col gap-2 p-4 transition hover:shadow-nav">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-strong">{b.title}</p>
              <span className="text-subtle" aria-hidden>
                →
              </span>
            </div>
            <div className="mt-auto space-y-0.5">
              {b.stats.map((s) => (
                <p
                  key={s.label}
                  className={`text-xs ${
                    s.tint === 'success'
                      ? 'text-success'
                      : s.tint === 'warn'
                        ? 'text-warning'
                        : 'text-subtle'
                  }`}
                >
                  <span className="font-medium">{s.value}</span> {s.label}
                </p>
              ))}
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
