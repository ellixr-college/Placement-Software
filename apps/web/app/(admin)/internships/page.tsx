'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@ellixr/ui';
import { BatchCards } from '../../../components/batch-cards';
import { listInternships, type Internship } from '../../../lib/internships';

interface Batch {
  key: string;
  label: string;
  items: Internship[];
}

/** Officer view: student-reported internships. Pick a batch card (e.g. "2026
 * MBA") to see every internship from that cohort. Read-only — students
 * self-report, there is no verification. */
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
      if (!map.has(key)) map.set(key, { key, label: `${gradYear || '—'} ${course}`, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort((a, b) => b.label.localeCompare(a.label));
  }, [items]);

  const openBatch = openKey ? batches.find((b) => b.key === openKey) ?? null : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Internships</h1>
        <p className="text-sm text-subtle">
          {openBatch
            ? `${openBatch.items.length} in ${openBatch.label}`
            : `Internships students found on their own · ${items.length} total across ${batches.length} ${
                batches.length === 1 ? 'batch' : 'batches'
              }`}
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : batches.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No internships submitted yet.</Card>
      ) : !openBatch ? (
        <BatchCards
          items={batches.map((b) => ({
            key: b.key,
            title: b.label,
            stats: [{ label: b.items.length === 1 ? 'internship' : 'internships', value: b.items.length }],
          }))}
          onSelect={setOpenKey}
        />
      ) : (
        <>
          <button
            onClick={() => setOpenKey(null)}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All batches
          </button>
          <div className="space-y-3">
            {openBatch.items.map((i) => (
              <Card key={i.id} className="space-y-2 p-4">
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
                {i.description && <p className="text-sm text-body">{i.description}</p>}
                {(i.pocName || i.pocEmail || i.pocPhone) && (
                  <div className="rounded-md bg-app px-3 py-2 text-xs text-subtle">
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
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
