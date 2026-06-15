'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import {
  closeJob,
  getEligibleStudents,
  getJob,
  publishJob,
  type EligibleStudent,
  type Job,
} from '../../../../lib/jobs';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [eligible, setEligible] = useState<EligibleStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setJob(await getJob(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onPublish() {
    setBusy(true);
    setError(null);
    try {
      const res = await publishJob(id);
      setJob(res.job);
      alert(`Published — ${res.eligibleCount} eligible student(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function onClose() {
    setBusy(true);
    setError(null);
    try {
      setJob(await closeJob(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadEligible() {
    setEligible(await getEligibleStudents(id));
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!job) return <p className="text-danger">{error ?? 'Job not found'}</p>;

  const ctc =
    job.ctcMin != null || job.ctcMax != null
      ? `₹${((job.ctcMin ?? job.ctcMax)! / 100000).toFixed(1)}–${((job.ctcMax ?? job.ctcMin)! / 100000).toFixed(1)} LPA`
      : '—';

  const workModeLabel = job.workMode
    ? job.workMode === 'ONSITE'
      ? 'Work from office'
      : job.workMode.charAt(0) + job.workMode.slice(1).toLowerCase()
    : '—';

  const experience =
    job.experienceMin != null && job.experienceMax != null
      ? `${job.experienceMin}–${job.experienceMax} yrs`
      : job.experienceMin != null
        ? `${job.experienceMin}+ yrs`
        : job.experienceMax != null
          ? `Up to ${job.experienceMax} yrs`
          : '—';

  // Platform jobs are owned by the Platform Admin — officers can manage their own
  // applicants via the pipeline but cannot edit, publish, or close the posting.
  const isPlatform = !!job.isPlatform;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/jobs" className="text-sm text-primary-600 hover:underline">← Jobs</Link>
        <div className="flex gap-2">
          {!isPlatform && job.status === 'DRAFT' && <Button onClick={onPublish} disabled={busy}>Publish</Button>}
          {!isPlatform && job.status !== 'CLOSED' && <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>}
          {job.status !== 'DRAFT' && (
            <Link href={`/jobs/${id}/pipeline`}><Button variant="ghost">Pipeline →</Button></Link>
          )}
        </div>
      </div>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">{job.title}</h1>
          <p className="text-sm text-subtle">{job.companyName ?? job.company?.name} · {job.jobType.replace('_', ' ')}{job.workMode ? ` · ${workModeLabel}` : ''}{job.location ? ` · ${job.location}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPlatform && <Badge tint="lavender">Platform</Badge>}
          <Badge tint={STATUS_TINT[job.status] ?? 'primary'}>{job.status}</Badge>
        </div>
      </header>

      {isPlatform && (
        <p className="rounded-md bg-tint-lavender px-3 py-2 text-xs text-body">
          This is a platform-broadcast job. You manage your own applicants in the pipeline, but the
          posting is owned by the platform team.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {job.description && <p className="text-sm text-body">{job.description}</p>}

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        <Detail label="CTC" value={ctc} />
        <Detail label="Work mode" value={workModeLabel} />
        <Detail label="Experience" value={experience} />
        <Detail label="Applicants" value={String(job.applicationCount ?? 0)} />
        <Detail label="Deadline" value={job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : '—'} />
        <Detail label="Courses" value={job.eligibleCourses.join(', ') || '—'} />
        <Detail label="Branches" value={job.eligibleBranches.join(', ') || '—'} />
        <Detail label="Grad years" value={job.graduationYears.join(', ') || '—'} />
        <Detail label="Min CGPA" value={job.minCgpa != null ? String(job.minCgpa) : '—'} />
        <Detail label="Max active backlogs" value={job.maxActiveBacklogs != null ? String(job.maxActiveBacklogs) : '—'} />
        <Detail label="Max total backlogs" value={job.maxTotalBacklogs != null ? String(job.maxTotalBacklogs) : '—'} />
      </Card>

      {!isPlatform && (
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-strong">Eligible students</h2>
          <Button size="sm" variant="ghost" onClick={loadEligible}>Preview</Button>
        </div>
        {eligible == null ? (
          <p className="text-xs text-subtle">Click preview to compute the eligible set.</p>
        ) : eligible.length === 0 ? (
          <p className="text-xs text-subtle">No verified students currently match this criteria.</p>
        ) : (
          <div className="space-y-1">
            {eligible.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-strong">{s.fullName} <span className="text-subtle">· {s.rollNumber}</span></span>
                <span className="text-xs text-subtle">{s.branch} · CGPA {s.cgpa ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-subtle">{label}</p>
      <p className="text-sm font-medium text-strong">{value}</p>
    </div>
  );
}
