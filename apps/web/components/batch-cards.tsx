'use client';

import { Card } from '@ellixr/ui';

export interface BatchCardItem {
  key: string;
  title: string;
  /** Small stat lines shown under the title, e.g. "42 students". */
  stats: { label: string; value: string | number; tint?: 'default' | 'success' | 'warn' }[];
}

const DOT: Record<'default' | 'success' | 'warn', string> = {
  default: 'bg-primary-400',
  success: 'bg-success',
  warn: 'bg-warning',
};

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((b) => (
        <button key={b.key} onClick={() => onSelect(b.key)} className="group text-left">
          <Card className="relative flex h-full flex-col gap-4 overflow-hidden p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-nav">
            {/* accent bar */}
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-card">
                  <CapIcon />
                </span>
                <p className="text-lg font-semibold text-strong">{b.title}</p>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-subtle transition group-hover:border-primary-400 group-hover:text-primary-600">
                →
              </span>
            </div>

            <div className="space-y-1.5">
              {b.stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT[s.tint ?? 'default']}`} />
                  <span className="font-semibold text-strong">{s.value}</span>
                  <span className="text-xs text-subtle">{s.label}</span>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" strokeLinejoin="round" />
      <path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
