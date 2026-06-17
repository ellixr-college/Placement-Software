'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, ProgressBar } from '@ellixr/ui';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  getMyEmployability,
  type CompletionStatus,
  type EmployabilitySummary,
} from '../../../../lib/training';

const STATUS_TINT: Record<CompletionStatus, 'mint' | 'lavender' | 'cream'> = {
  COMPLETED: 'mint',
  IN_PROGRESS: 'lavender',
  NOT_STARTED: 'cream',
};

export default function MyEmployabilityPage() {
  const [data, setData] = useState<EmployabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await getMyEmployability());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your readiness');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return null;

  const { scores, readiness, records } = data;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/me" className="text-sm text-primary-600">
            ← Home
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-strong">Employability</h1>
        </div>
      </header>

      <div className="rounded-card bg-gradient-primary p-6 text-white shadow-nav">
        <p className="text-xs opacity-90">Your readiness score</p>
        <p className="mt-1 text-4xl font-semibold">
          {readiness != null ? `${readiness}%` : '—'}
        </p>
        <p className="mt-2 text-sm opacity-90">
          {readiness == null
            ? 'No assessments recorded yet. Your placement office will update this as you train.'
            : readiness >= 75
              ? 'You’re job ready — keep it up!'
              : readiness >= 50
                ? 'You’re developing well. Focus on your weaker areas below.'
                : 'Plenty of room to grow — attend training to boost your score.'}
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <p className="text-xs font-semibold uppercase text-subtle">Assessment scores</p>
        <ScoreRow label="Aptitude" value={scores.aptitude} />
        <ScoreRow label="Communication" value={scores.communication} />
        <ScoreRow label="Interview" value={scores.interview} />
      </Card>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-strong">Training programs</h3>
        {records.length === 0 ? (
          <Card className="p-5 text-center text-sm text-subtle">
            You haven’t been enrolled in any training programs yet.
          </Card>
        ) : (
          records.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-strong">{r.programName}</p>
                  <p className="text-xs text-subtle">{CATEGORY_LABELS[r.category]}</p>
                </div>
                <Badge tint={STATUS_TINT[r.completionStatus]}>
                  {STATUS_LABELS[r.completionStatus]}
                </Badge>
              </div>
              <div className="mt-3 flex gap-6 text-sm">
                <span className="text-subtle">
                  Attendance:{' '}
                  <span className="font-medium text-strong">
                    {r.attendancePercent != null ? `${r.attendancePercent}%` : '—'}
                  </span>
                </span>
                <span className="text-subtle">
                  Score:{' '}
                  <span className="font-medium text-strong">
                    {r.score != null ? r.score : '—'}
                  </span>
                </span>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <ProgressBar
      value={value ?? 0}
      label={label}
      caption={value != null ? `${value}/100` : 'Not assessed'}
    />
  );
}
