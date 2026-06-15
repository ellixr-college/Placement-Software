'use client';

import { useEffect, useState } from 'react';
import { ProgressBar, SectionCard, StatTile } from '@ellixr/ui';
import { useSession } from '../../../../lib/session';
import { getPlatformOverview, type PlatformOverview } from '../../../../lib/platform-analytics';

export default function PlatformDashboardPage() {
  const { user, loading } = useSession();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the session to restore the access token before fetching, so we
    // don't race the auth bootstrap (which would 401 → "Missing access token").
    if (loading || !user) return;
    getPlatformOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'));
  }, [loading, user]);

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const maxCollege = Math.max(1, ...(data?.studentsByCollege.map((c) => c.students) ?? [1]));
  const maxBatch = Math.max(1, ...(data?.placementsByBatch.map((b) => b.placements) ?? [1]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Welcome, {firstName}</h1>
        <p className="text-sm text-subtle">Platform-wide overview across all your colleges</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          gradient="ocean"
          label="College tie-ups"
          value={data ? data.colleges : '—'}
          hint={data ? `${data.activeColleges} active` : undefined}
        />
        <StatTile
          gradient="sunset"
          label="Students registered"
          value={data ? data.students.toLocaleString() : '—'}
          hint={data ? `${data.verifiedStudents.toLocaleString()} verified` : undefined}
        />
        <StatTile
          gradient="violet"
          label="Jobs posted"
          value={data ? data.jobs.toLocaleString() : '—'}
          hint={data ? `${data.platformJobs} platform-broadcast` : undefined}
        />
        <StatTile
          gradient="primary"
          label="Offers released"
          value={data ? data.offers.toLocaleString() : '—'}
          hint={data ? `${data.placementRate}% placement rate` : undefined}
        />
      </div>

      {/* Secondary metrics (plain tiles) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Students placed" value={data ? data.placedStudents.toLocaleString() : '—'} />
        <StatTile label="Verified students" value={data ? data.verifiedStudents.toLocaleString() : '—'} />
        <StatTile label="Applications" value={data ? data.applications.toLocaleString() : '—'} />
        <StatTile label="Active colleges" value={data ? data.activeColleges : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Students by college" subtitle="Top colleges by registered students">
          {!data ? (
            <p className="text-sm text-subtle">Loading…</p>
          ) : data.studentsByCollege.length === 0 ? (
            <p className="text-sm text-subtle">No students registered yet.</p>
          ) : (
            <div className="space-y-4">
              {data.studentsByCollege.map((c) => (
                <ProgressBar
                  key={c.collegeId}
                  value={(c.students / maxCollege) * 100}
                  label={c.name}
                  caption={c.students.toLocaleString()}
                  fillClassName="bg-gradient-ocean"
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Placements by batch" subtitle="Secured placements per graduation year">
          {!data ? (
            <p className="text-sm text-subtle">Loading…</p>
          ) : data.placementsByBatch.length === 0 ? (
            <p className="text-sm text-subtle">No placements recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {data.placementsByBatch.map((b) => (
                <ProgressBar
                  key={b.graduationYear}
                  value={(b.placements / maxBatch) * 100}
                  label={`Batch ${b.graduationYear}`}
                  caption={b.placements.toLocaleString()}
                  fillClassName="bg-gradient-sunset"
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
