'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { PdfModal } from '../../../../components/pdf-modal';
import { useRouter } from 'next/navigation';
import {
  closeJob,
  deleteJob,
  formatCtc,
  getEligibleStudents,
  getJob,
  getJobApplicants,
  getJobPdfObjectUrl,
  publishJob,
  type EligibleStudent,
  type Job,
} from '../../../../lib/jobs';
import { useConfirm } from '../../../../components/confirm-provider';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const [job, setJob] = useState<Job | null>(null);
  const [eligible, setEligible] = useState<EligibleStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
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

  async function openPdf() {
    setLoadingPdf(true);
    setError(null);
    try {
      setPdfObjectUrl(await getJobPdfObjectUrl(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open PDF');
    } finally {
      setLoadingPdf(false);
    }
  }

  function closePdf() {
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    setPdfObjectUrl(null);
  }

  async function exportApplicants() {
    setBusy(true);
    setError(null);
    try {
      const rows = await getJobApplicants(id);
      if (rows.length === 0) {
        setError('No applicants to export yet.');
        return;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const header = ['Reg No', 'Name', 'Email', 'Mobile', 'DOB', 'Resume link', 'Stage', 'Applied on'];
      const csv = [header, ...rows.map((r) => [
        r.rollNumber,
        r.fullName,
        r.email,
        r.phone ?? '',
        r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : '',
        r.resumeSlug ? `${origin}/r/${r.resumeSlug}` : '',
        r.stage,
        new Date(r.appliedAt).toLocaleDateString(),
      ])]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applicants-${job?.title ?? 'job'}.csv`.replace(/[^\w.-]+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Delete "${job?.title}"?`,
      message: 'This permanently removes the job and all its applications. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      acknowledgement: 'I understand this is permanent.',
    });
    if (!ok) return;
    try {
      await deleteJob(id);
      router.push('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!job) return <p className="text-danger">{error ?? 'Job not found'}</p>;

  const ctc = formatCtc(job.ctcMin, job.ctcMax);

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
          {!isPlatform && job.status !== 'CLOSED' && (
            <Link href={`/jobs/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          {!isPlatform && job.status === 'DRAFT' && <Button onClick={onPublish} disabled={busy}>Publish</Button>}
          {!isPlatform && job.status !== 'DRAFT' && (
            <Button variant="outline" onClick={exportApplicants} disabled={busy}>
              Export applicants
            </Button>
          )}
          {job.status !== 'DRAFT' && (
            <Link href={`/jobs/${id}/pipeline`}><Button variant="ghost">View applicants →</Button></Link>
          )}
          {!isPlatform && (
            <JobMenu
              canClose={job.status !== 'CLOSED'}
              onClose={onClose}
              onDelete={onDelete}
              disabled={busy}
            />
          )}
        </div>
      </div>

      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-2xl font-bold text-primary-700">
          {(job.companyName ?? job.company?.name ?? '·').trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold text-strong">{job.title}</h1>
            <div className="flex shrink-0 items-center gap-2">
              {isPlatform && <Badge tint="lavender">Platform</Badge>}
              <Badge tint={STATUS_TINT[job.status] ?? 'primary'}>{job.status}</Badge>
            </div>
          </div>
          <p className="text-sm font-medium text-body">{job.companyName ?? job.company?.name}</p>
          <p className="mt-0.5 text-xs text-subtle">
            {[job.jobType.replace(/_/g, ' '), job.workMode ? workModeLabel : null, job.location]
              .filter(Boolean)
              .join(' · ')}
            {job.publishedAt
              ? ` · Posted ${new Date(job.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
              : ''}
          </p>
        </div>
      </header>

      {isPlatform && (
        <p className="rounded-md bg-tint-lavender px-3 py-2 text-xs text-body">
          This is a platform-broadcast job. You manage your own applicants in the pipeline, but the
          posting is owned by the platform team.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {job.pdfUrl && (
        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-danger/10 text-xs font-bold text-danger">
              PDF
            </span>
            <div>
              <p className="text-sm font-semibold text-strong">Job description</p>
              <p className="text-xs text-subtle">{job.pdfName ?? 'Attached PDF'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openPdf} loading={loadingPdf}>
            View PDF
          </Button>
        </Card>
      )}
      {pdfObjectUrl && (
        <PdfModal url={pdfObjectUrl} name={job.pdfName} onClose={closePdf} />
      )}
      {job.description && (
        <Card className="space-y-2 p-5">
          <h2 className="text-sm font-semibold text-strong">About the job</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">{job.description}</p>
        </Card>
      )}

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        <Detail label="CTC" value={ctc} />
        <Detail label="Work mode" value={workModeLabel} />
        <Detail label="Experience" value={experience} />
        <Detail label="Applicants" value={String(job.applicationCount ?? 0)} />
        <Detail label="Deadline" value={job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : '—'} />
        <Detail label="Courses" value={job.eligibleCourses.join(', ') || '—'} />
        <Detail label="Branches" value={job.eligibleBranches.join(', ') || '—'} />
        <Detail label="Grad years" value={job.graduationYears.join(', ') || '—'} />
        <Detail label="Min %" value={job.minCgpa != null ? `${job.minCgpa}%` : '—'} />
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
                <span className="text-xs text-subtle">{s.branch} · {s.cgpa != null ? `${s.cgpa}%` : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}

/** ⋮ menu for secondary job actions (close / delete). */
function JobMenu({
  canClose,
  onClose,
  onDelete,
  disabled,
}: {
  canClose: boolean;
  onClose: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const item = 'block w-full px-3 py-2 text-left text-sm hover:bg-app';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="More actions"
        className="flex h-10 w-10 items-center justify-center rounded-md text-subtle transition hover:bg-app hover:text-strong disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-md border border-border bg-white py-1 shadow-card">
          {canClose && (
            <button
              onClick={() => {
                setOpen(false);
                onClose();
              }}
              className={`${item} text-body`}
            >
              Close job
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={`${item} text-danger`}
          >
            Delete job
          </button>
        </div>
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
