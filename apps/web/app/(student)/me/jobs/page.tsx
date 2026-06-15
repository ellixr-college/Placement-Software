'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import { applyToJob, getJobFeed, type Job } from '../../../../lib/jobs';

/**
 * Student job feed (mobile). Shows only PUBLISHED jobs the authenticated student
 * is eligible for — eligibility is enforced server-side; this is just the view.
 */
export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function load() {
    try {
      setJobs(await getJobFeed());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function apply(id: string) {
    setApplyingId(id);
    setError(null);
    try {
      await applyToJob(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply');
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-strong">Jobs for you</h1>
        <p className="text-sm text-subtle">{jobs.length} opening(s) you're eligible for</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : jobs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">
          No openings match your profile right now. Make sure your profile is verified.
        </Card>
      ) : (
        jobs.map((j) => {
          const ctc =
            j.ctcMin != null || j.ctcMax != null
              ? `₹${((j.ctcMin ?? j.ctcMax)! / 100000).toFixed(1)}–${((j.ctcMax ?? j.ctcMin)! / 100000).toFixed(1)} LPA`
              : null;
          return (
            <Card key={j.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-strong">{j.title}</h2>
                  <p className="text-sm text-subtle">{j.companyName ?? j.company?.name} · {j.jobType.replace('_', ' ')}{j.workMode ? ` · ${j.workMode === 'ONSITE' ? 'Work from office' : j.workMode.charAt(0) + j.workMode.slice(1).toLowerCase()}` : ''}{j.location ? ` · ${j.location}` : ''}</p>
                </div>
                {j.applied && <Badge tint="mint">{j.myStage ?? 'Applied'}</Badge>}
              </div>
              {j.description && <p className="line-clamp-3 text-sm text-body">{j.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-strong">{ctc ?? ''}</span>
                {j.applied ? (
                  <Button size="sm" variant="ghost" disabled>Applied</Button>
                ) : (
                  <Button size="sm" disabled={applyingId === j.id} onClick={() => apply(j.id)}>
                    {applyingId === j.id ? 'Applying…' : 'Apply'}
                  </Button>
                )}
              </div>
              {j.applicationDeadline && (
                <p className="text-xs text-subtle">Apply by {new Date(j.applicationDeadline).toLocaleDateString()}</p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
