'use client';

import { Card } from '@ellixr/ui';

export interface BatchCardItem {
  key: string;
  title: string;
  /** Small label above the title, e.g. "Graduation Year". Defaults to "Batch". */
  category?: string;
  /** Stat columns shown under the title, e.g. { label: "students", value: 55 }. */
  stats: { label: string; value: string | number; tint?: 'default' | 'success' | 'warn' }[];
}

const VALUE_TINT: Record<'default' | 'success' | 'warn', string> = {
  default: 'text-strong',
  success: 'text-success',
  warn: 'text-warning',
};

// Soft top-bar accent colours, picked deterministically per card.
const ACCENTS = [
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
];
const hash = (s: string) => [...s].reduce((n, c) => n + c.charCodeAt(0), 0);

/** Responsive grid of cohort cards. Used by Students, Internships and Alumni screens
 * to drill from a batch into its table. */
export function BatchCards({
  items,
  onSelect,
}: {
  items: BatchCardItem[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((b) => (
        <button key={b.key} onClick={() => onSelect(b.key)} className="group text-left">
          <Card className="relative overflow-hidden rounded-2xl p-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-nav">
            {/* top accent bar */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r ${ACCENTS[hash(b.key) % ACCENTS.length]}`}
            />

            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {b.category ?? 'Batch'}
                  </p>
                  <p className="mt-1 text-2xl font-bold leading-tight text-strong">{b.title}</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-app text-subtle ring-1 ring-border transition group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600">
                  →
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {b.stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-app/60 px-3 py-2 text-center transition group-hover:bg-app"
                  >
                    <p className={`text-lg font-bold ${VALUE_TINT[s.tint ?? 'default']}`}>
                      {s.value}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
