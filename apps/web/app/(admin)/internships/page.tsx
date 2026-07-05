'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@ellixr/ui';
import { listInternships, type Internship } from '../../../lib/internships';

interface Batch {
  key: string;
  label: string;
  graduationYear: number;
  course: string;
  items: Internship[];
}

/** Officer view: student-reported internships grouped batch by batch (e.g.
 * "2026 MBA"). Read-only — students self-report, there is no verification. */
export default function InternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setItems(await listInternships());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load internships');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const batches = useMemo<Batch[]>(() => {
    const map = new Map<string, Batch>();
    for (const i of items) {
      const gradYear = i.graduationYear ?? 0;
      const course = i.studentCourse ?? 'Unknown';
      const key = `${gradYear}|${course}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${gradYear || '—'} ${course}`,
          graduationYear: gradYear,
          course,
          items: [],
        });
      }
      map.get(key)!.items.push(i);
    }
    // Newest batch first, then course alphabetically.
    return [...map.values()].sort(
      (a, b) => b.graduationYear - a.graduationYear || a.course.localeCompare(b.course),
    );
  }, [items]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Internships</h1>
        <p className="text-sm text-subtle">
          Internships students found on their own · {items.length} total across {batches.length}{' '}
          {batches.length === 1 ? 'batch' : 'batches'}
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : batches.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">
          No internships submitted yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => {
            const open = openKey === b.key;
            return (
              <Card key={b.key} className="overflow-hidden p-0">
                <button
                  onClick={() => setOpenKey(open ? null : b.key)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-app/60"
                >
                  <div>
                    <p className="font-semibold text-strong">{b.label}</p>
                    <p className="text-xs text-subtle">
                      {b.items.length} {b.items.length === 1 ? 'internship' : 'internships'}
                    </p>
                  </div>
                  <span
                    className={`text-subtle transition-transform ${open ? 'rotate-90' : ''}`}
                    aria-hidden
                  >
                    →
                  </span>
                </button>

                {open && (
                  <div className="space-y-3 border-t border-border bg-app/40 p-4">
                    {b.items.map((i) => (
                      <div key={i.id} className="rounded-card border border-border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-strong">
                              {i.studentName}{' '}
                              <span className="text-xs font-normal text-subtle">· {i.rollNumber}</span>
                            </p>
                            <p className="text-sm text-body">
                              {i.role} @ {i.companyName}
                            </p>
                            {i.location && <p className="text-xs text-subtle">{i.location}</p>}
                          </div>
                          <span className="shrink-0 text-xs text-subtle">{fmt(i.createdAt)}</span>
                        </div>
                        {i.description && <p className="mt-2 text-sm text-body">{i.description}</p>}
                        {(i.pocName || i.pocEmail || i.pocPhone) && (
                          <div className="mt-2 rounded-md bg-app px-3 py-2 text-xs text-subtle">
                            <span className="font-medium text-body">Contact:</span>{' '}
                            {i.pocName && <span>{i.pocName}</span>}
                            {i.pocEmail && (
                              <>
                                {i.pocName ? ' · ' : ''}
                                <a href={`mailto:${i.pocEmail}`} className="text-primary-600 hover:underline">
                                  {i.pocEmail}
                                </a>
                              </>
                            )}
                            {i.pocPhone && <span> · {i.pocPhone}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
