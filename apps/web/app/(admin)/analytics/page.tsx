'use client';

import { useEffect, useState } from 'react';
import { SectionCard, StatTile } from '@ellixr/ui';
import {
  getBreakdowns,
  getFunnel,
  getJobMetrics,
  getPlacementMetrics,
  getStudentMetrics,
  type Breakdowns,
  type FunnelStage,
  type JobMetrics,
  type PlacementMetrics,
  type StudentMetrics,
} from '../../../lib/analytics';

const lpa = (v: number | null) => (v == null ? '—' : `₹${(v / 100000).toFixed(2)} LPA`);

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

export default function AnalyticsPage() {
  const [placement, setPlacement] = useState<PlacementMetrics | null>(null);
  const [jobs, setJobs] = useState<JobMetrics | null>(null);
  const [students, setStudents] = useState<StudentMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdowns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, j, s, f, b] = await Promise.all([
          getPlacementMetrics(),
          getJobMetrics(),
          getStudentMetrics(),
          getFunnel(),
          getBreakdowns(),
        ]);
        setPlacement(p);
        setJobs(j);
        setStudents(s);
        setFunnel(f);
        setBreakdowns(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Analytics</h1>
        <p className="text-sm text-subtle">Placement, jobs &amp; student metrics for your college.</p>
      </header>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile gradient="ocean" label="Placement rate" value={`${placement?.placementRate ?? 0}%`} hint={`${placement?.placedStudents ?? 0} of ${placement?.verifiedStudents ?? 0} verified`} />
        <StatTile gradient="sunset" label="Avg package" value={lpa(placement?.avgPackage ?? null)} hint={`Median ${lpa(placement?.medianPackage ?? null)}`} />
        <StatTile gradient="violet" label="Highest package" value={lpa(placement?.highestPackage ?? null)} hint={`${placement?.offersCount ?? 0} offers`} />
        <StatTile gradient="primary" label="Conversion" value={`${jobs?.conversionRate ?? 0}%`} hint={`${jobs?.offersReleased ?? 0} offers / ${jobs?.applicationsReceived ?? 0} apps`} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Students" value={String(students?.total ?? 0)} hint={`${students?.active ?? 0} active`} />
        <StatTile label="Placed" value={String(students?.placed ?? 0)} hint={`${students?.unplaced ?? 0} unplaced`} />
        <StatTile label="Jobs posted" value={String(jobs?.jobsPosted ?? 0)} hint={`${jobs?.jobsPublished ?? 0} published`} />
        <StatTile label="Applications" value={String(jobs?.applicationsReceived ?? 0)} hint="across all jobs" />
      </div>

      {/* Application funnel */}
      <SectionCard title="Application funnel">
        <div className="space-y-2.5">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-subtle">{STAGE_LABEL[f.stage] ?? f.stage}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-pill bg-muted">
                <div
                  className="h-full rounded-pill bg-gradient-ocean"
                  style={{ width: `${(f.count / funnelMax) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-strong">{f.count}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Placement by branch">
          <BreakdownTable
            rows={(breakdowns?.byBranch ?? []).map((r) => ({
              label: r.branch,
              total: r.total,
              placed: r.placed,
              rate: r.placementRate,
            }))}
          />
        </SectionCard>

        <SectionCard title="Placement by batch">
          <BreakdownTable
            rows={(breakdowns?.byBatch ?? []).map((r) => ({
              label: String(r.graduationYear),
              total: r.total,
              placed: r.placed,
              rate: r.placementRate,
            }))}
          />
        </SectionCard>
      </div>

      {/* Company-wise hires */}
      <SectionCard title="Top recruiters">
        {(breakdowns?.byCompany ?? []).length === 0 ? (
          <p className="text-xs text-subtle">No hires recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-subtle">
              <tr>
                <th className="py-1 font-medium">Company</th>
                <th className="py-1 font-medium">Hires</th>
                <th className="py-1 font-medium">Avg package</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns!.byCompany.map((c) => (
                <tr key={c.company} className="border-t border-border">
                  <td className="py-2 text-strong">{c.company}</td>
                  <td className="py-2">{c.hires}</td>
                  <td className="py-2">{lpa(c.avgPackage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

function BreakdownTable({
  rows,
}: {
  rows: { label: string; total: number; placed: number; rate: number }[];
}) {
  if (rows.length === 0) return <p className="text-xs text-subtle">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs text-strong">{r.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-pill bg-muted">
            <div className="h-full rounded-pill bg-gradient-primary" style={{ width: `${r.rate}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-xs text-subtle">
            {r.placed}/{r.total} · {r.rate}%
          </span>
        </div>
      ))}
    </div>
  );
}
