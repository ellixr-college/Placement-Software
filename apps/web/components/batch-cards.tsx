'use client';

import { Card } from '@ellixr/ui';

export interface BatchCardItem {
  key: string;
  title: string;
  /** Small label above the title, e.g. "Batch". Defaults to "Batch". */
  category?: string;
  /** Stat columns shown under the title, e.g. { label: "students", value: 55 }. */
  stats: { label: string; value: string | number; tint?: 'default' | 'success' | 'warn' }[];
}

const VALUE_TINT: Record<'default' | 'success' | 'warn', string> = {
  default: 'text-strong',
  success: 'text-success',
  warn: 'text-warning',
};

// Soft decorative blob colours, picked deterministically per card for variety.
const BLOBS = [
  'text-sky-300',
  'text-emerald-300',
  'text-amber-300',
  'text-violet-300',
  'text-rose-300',
];
const hash = (s: string) => [...s].reduce((n, c) => n + c.charCodeAt(0), 0);

/** Responsive grid of premium cohort cards. Used by the Students, Internships
 * and Alumni officer screens to drill from a batch into its table. */
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
          <Card className="relative h-full overflow-hidden rounded-2xl p-6 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-nav">
            {/* decorative blob */}
            <svg
              viewBox="0 0 200 200"
              aria-hidden
              className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-25 ${
                BLOBS[hash(b.key) % BLOBS.length]
              }`}
            >
              <path
                fill="currentColor"
                d="M45.7,-58.9C58.9,-49.3,69.1,-34.8,72.6,-18.7C76.1,-2.6,72.9,15.1,64.3,29.4C55.7,43.7,41.7,54.6,26.1,61.4C10.5,68.2,-6.7,70.9,-22.9,66.4C-39.1,61.9,-54.3,50.2,-63.2,34.8C-72.1,19.4,-74.7,0.3,-70.3,-16.7C-65.9,-33.7,-54.5,-48.6,-40.5,-58C-26.5,-67.4,-9.9,-71.3,4.6,-77.5C19.1,-83.7,38.2,-92.2,45.7,-58.9Z"
                transform="translate(100 100)"
              />
            </svg>

            <div className="relative flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-card">
                <CapIcon />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-subtle shadow-card ring-1 ring-border transition group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600">
                →
              </span>
            </div>

            <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-subtle">
              {b.category ?? 'Batch'}
            </p>
            <p className="relative text-2xl font-bold leading-tight text-strong">{b.title}</p>

            <div className="relative mt-5 flex flex-wrap gap-x-7 gap-y-3">
              {b.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">
                    {s.label}
                  </p>
                  <p className={`text-lg font-bold ${VALUE_TINT[s.tint ?? 'default']}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}

function CapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <path d="M12 4 2 9l10 5 10-5-10-5Z" strokeLinejoin="round" />
      <path
        d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
