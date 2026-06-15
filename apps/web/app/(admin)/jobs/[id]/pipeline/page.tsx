'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@ellixr/ui';
import { ATS_STAGES, getPipeline, type PipelineEntry } from '../../../../../lib/applications';
import { getJob, type Job } from '../../../../../lib/jobs';

// Columns shown on the board. REJECTED/WITHDRAWN get their own trailing lanes.
const COLUMNS = [...ATS_STAGES, 'REJECTED', 'WITHDRAWN'];

const STAGE_LABEL: Record<string, string> = {
  APPLIED: 'Applied',
  VERIFIED: 'Verified',
  SHORTLISTED: 'Shortlisted',
  ROUND_1: 'Round 1',
  ROUND_2: 'Round 2',
  ROUND_3: 'Round 3',
  HR: 'HR',
  OFFER_RELEASED: 'Offer released',
  OFFER_ACCEPTED: 'Offer accepted',
  JOINED: 'Joined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [j, p] = await Promise.all([getJob(id), getPipeline(id)]);
        setJob(j);
        setEntries(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const byStage = (stage: string) => entries.filter((e) => e.stage === stage);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${id}`} className="text-sm text-primary-600 hover:underline">← {job?.title ?? 'Job'}</Link>
        <h1 className="mt-1 text-2xl font-semibold text-strong">Pipeline</h1>
        <p className="text-sm text-subtle">{entries.length} applicant(s)</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => {
          const col = byStage(stage);
          return (
            <div key={stage} className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase text-subtle">{STAGE_LABEL[stage] ?? stage}</span>
                <span className="text-xs text-subtle">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((e) => (
                  <Link key={e.id} href={`/applications/${e.id}`}>
                    <Card className="p-3 transition hover:border-primary-300">
                      <p className="text-sm font-medium text-strong">{e.student.fullName}</p>
                      <p className="text-xs text-subtle">{e.student.rollNumber} · {e.student.branch}</p>
                      <p className="mt-1 text-xs text-subtle">
                        CGPA {e.student.cgpa ?? '—'}
                        {e.offerCtc != null && <> · ₹{(e.offerCtc / 100000).toFixed(1)} LPA</>}
                      </p>
                    </Card>
                  </Link>
                ))}
                {col.length === 0 && <div className="rounded-card border border-dashed border-border py-4 text-center text-xs text-subtle">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
