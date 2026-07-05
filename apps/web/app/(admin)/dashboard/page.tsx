'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, SectionCard, StatTile } from '@ellixr/ui';
import { useSession } from '../../../lib/session';
import {
  getJobMetrics,
  getPlacementMetrics,
  getStudentMetrics,
  type JobMetrics,
  type PlacementMetrics,
  type StudentMetrics,
} from '../../../lib/analytics';
import { listPendingResults, type PendingResult } from '../../../lib/rounds';

/** Placement Officer / College Admin home — real tenant metrics. */
export default function DashboardPage() {
  const { user, loading } = useSession();
  const [students, setStudents] = useState<StudentMetrics | null>(null);
  const [jobs, setJobs] = useState<JobMetrics | null>(null);
  const [placement, setPlacement] = useState<PlacementMetrics | null>(null);
  const [pending, setPending] = useState<PendingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the session to restore the access token before fetching.
    if (loading || !user) return;
    Promise.all([getStudentMetrics(), getJobMetrics(), getPlacementMetrics()])
      .then(([s, j, p]) => {
        setStudents(s);
        setJobs(j);
        setPlacement(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load metrics'));
    listPendingResults().then(setPending).catch(() => {});
  }, [loading, user]);

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const lpa = (v: number | null) => (v == null ? '—' : `₹${(v / 100000).toFixed(1)}L`);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Welcome, {firstName}</h1>
        <p className="text-sm text-subtle">Placement overview for {user?.college?.name ?? 'your college'}</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Rounds whose interview date has passed but results aren't entered yet */}
      {pending.length > 0 && (
        <Card className="space-y-2 border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-strong">
            ⚠ {pending.length} round result{pending.length === 1 ? '' : 's'} pending
          </p>
          <div className="space-y-1">
            {pending.map((p) => (
              <Link
                key={p.roundId}
                href={`/jobs/${p.jobId}/pipeline`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-white"
              >
                <span className="text-body">
                  <span className="font-medium text-strong">{p.jobTitle}</span> · {p.roundTitle}
                </span>
                <span className="text-xs text-warning">
                  due {p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString() : ''} · enter results →
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          gradient="ocean"
          label="Total students"
          value={students ? students.total.toLocaleString() : '—'}
          hint={students ? `${students.active.toLocaleString()} active` : undefined}
        />
        <StatTile
          gradient="sunset"
          label="Placed"
          value={students ? students.placed.toLocaleString() : '—'}
          hint={placement ? `${placement.placementRate}% rate` : undefined}
        />
        <StatTile
          gradient="violet"
          label="Active jobs"
          value={jobs ? jobs.jobsPublished.toLocaleString() : '—'}
          hint={jobs ? `${jobs.jobsPosted.toLocaleString()} posted` : undefined}
        />
        <StatTile
          gradient="primary"
          label="Offers"
          value={placement ? placement.offersCount.toLocaleString() : '—'}
          hint={placement ? `avg ${lpa(placement.avgPackage)}` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Verified" value={placement ? placement.verifiedStudents.toLocaleString() : '—'} />
        <StatTile label="Applications" value={jobs ? jobs.applicationsReceived.toLocaleString() : '—'} />
        <StatTile label="Highest package" value={lpa(placement?.highestPackage ?? null)} />
        <StatTile label="Median package" value={lpa(placement?.medianPackage ?? null)} />
      </div>

      <SectionCard title="Welcome to Ellixr" subtitle="Your placement command center">
        <p className="text-sm text-body">
          Manage students, companies, jobs, the ATS pipeline, alumni, and analytics from the left
          navigation. Head to <span className="font-medium text-strong">Analytics</span> for the full
          breakdown by branch, batch and recruiter.
        </p>
      </SectionCard>
    </div>
  );
}
