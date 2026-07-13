'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Card } from '@ellixr/ui';
import { applyToJob, formatCtc, formatLpa, getJob, type Job } from '../../../../../lib/jobs';
import { listMyApplications, type Application } from '../../../../../lib/applications';
import { PdfModal } from '../../../../../components/pdf-modal';
import { ApplyModal } from '../../../../../components/apply-modal';
import { ApplicationTimeline } from '../../../../../components/application-timeline';
import { EligibilityCheckModal } from '../../../../../components/eligibility-check-modal';
import { DetailSkeleton } from '../../../../../components/page-skeleton';
import { mutate, useApi } from '../../../../../lib/use-api';

const STATUS: Record<string, { label: string; tint: 'mint' | 'rose' | 'cream' | 'lavender' }> = {
  APPLIED: { label: 'Applied', tint: 'cream' },
  IN_PROGRESS: { label: 'In progress', tint: 'lavender' },
  SELECTED: { label: 'Selected', tint: 'mint' },
  REJECTED: { label: 'Not selected', tint: 'rose' },
  WITHDRAWN: { label: 'Withdrawn', tint: 'cream' },
};

const workModeLabel = (m: string | null) =>
  !m ? null : m === 'ONSITE' ? 'Work from office' : m.charAt(0) + m.slice(1).toLowerCase();

export default function StudentJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [pdfView, setPdfView] = useState<{ url: string; name?: string | null } | null>(null);

  const { data: job } = useApi<Job>(`/student/job/${id}`, () => getJob(id));
  const { data: apps } = useApi<Application[]>('/student/applications', listMyApplications);

  const app = apps?.find((a) => a.job.id === id) ?? null;

  function onApplyClick() {
    if (!job) return;
    if (job.eligible === false) {
      setEligibilityOpen(true);
      return;
    }
    continueApply();
  }

  function continueApply() {
    if (!job) return;
    if (job.applicationFormFields && job.applicationFormFields.length > 0) setFormOpen(true);
    else apply();
  }

  async function apply(responses?: Record<string, string>) {
    setApplying(true);
    try {
      await applyToJob(id, responses);
      setFormOpen(false);
      await mutate(`/student/job/${id}`);
      await mutate('/student/applications');
      await mutate('/student/jobs');
    } catch (err) {
      throw err;
    } finally {
      setApplying(false);
    }
  }

  if (!job) return <DetailSkeleton />;

  const company = job.companyName ?? job.company?.name ?? 'Company';
  const chips = [job.jobType.replace(/_/g, ' '), workModeLabel(job.workMode), job.location].filter(
    Boolean,
  ) as string[];
  const notEligible = job.eligible === false;
  const expired =
    !!job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now();
  const applied = !!app;
  const st = app ? (STATUS[app.status] ?? STATUS.APPLIED) : null;

  return (
    <div className="space-y-5 pb-28">
      <Link href="/me/jobs" className="text-sm text-primary-600">
        ← Jobs
      </Link>

      {/* Header */}
      <div className="animate-rise flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-strong shadow-card">
          {company.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-strong">{job.title}</h1>
          <p className="text-sm text-subtle">{company}</p>
        </div>
        {applied && st && <Badge tint={st.tint}>{st.label}</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-body shadow-sm"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Track application (if applied) */}
      {applied && app && (
        <Card className="animate-rise space-y-3 p-4">
          <p className="text-sm font-semibold text-strong">Application status</p>
          <ApplicationTimeline app={app} />
          {app.status === 'SELECTED' && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-success/10 px-3 py-2">
              <span className="text-sm font-medium text-success">
                🎉 You&apos;ve been selected!
              </span>
              {app.offerCtc != null && (
                <span className="text-sm text-body">{formatLpa(app.offerCtc)}</span>
              )}
              {app.offerLetterUrl && (
                <a
                  href={app.offerLetterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  Offer letter
                </a>
              )}
            </div>
          )}
        </Card>
      )}

      {/* About */}
      <Card className="animate-rise space-y-3 p-4" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Meta label="CTC" value={formatCtc(job.ctcMin, job.ctcMax)} />
          {job.applicationDeadline && (
            <Meta
              label="Apply by"
              value={new Date(job.applicationDeadline).toLocaleDateString()}
              highlight={expired}
            />
          )}
        </div>
        {job.description && (
          <>
            <p className="text-sm font-semibold text-strong">About this job</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
              {job.description}
            </p>
          </>
        )}
        {job.pdfUrl && (
          <button
            onClick={async () => {
              try {
                setPdfView({ url: job.pdfUrl!, name: job.pdfName });
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Could not open PDF');
              }
            }}
            className="press inline-flex w-fit items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-body"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-danger/10 text-[10px] font-bold text-danger">
              PDF
            </span>
            View job description
          </button>
        )}
      </Card>

      {/* Who can apply */}
      <Card className="animate-rise space-y-2 p-4" style={{ animationDelay: '120ms' }}>
        <p className="text-sm font-semibold text-strong">Who can apply</p>
        <dl className="space-y-2">
          <Row label="Courses" value={job.eligibleCourses.join(', ') || 'Any'} />
          <Row label="Branches" value={job.eligibleBranches.join(', ') || 'Any'} />
          <Row label="Batch" value={job.graduationYears.join(', ') || 'Any'} />
          {job.minUgPercentage != null && (
            <Row label="Min UG %" value={`${job.minUgPercentage}%`} />
          )}
          {job.minCgpa != null && <Row label="Min PG %" value={`${job.minCgpa}%`} />}
        </dl>
      </Card>

      {notEligible && !applied && (
        <div className="rounded-md bg-tint-cream/50 px-3 py-2 text-xs text-tint-cream-fg">
          <span className="font-medium">Tap Apply to complete required details.</span>{' '}
          {(job.eligibilityReasons ?? []).filter((r) => r !== 'Profile not verified').join(' · ') ||
            "You don't meet the criteria."}
        </div>
      )}

      {/* Sticky action footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {applied ? (
          <button
            disabled
            className="w-full rounded-pill bg-app py-3 text-sm font-semibold text-subtle"
          >
            {st?.label ?? 'Applied'}
          </button>
        ) : expired ? (
          <button
            disabled
            className="w-full rounded-pill bg-app py-3 text-sm font-semibold text-subtle"
          >
            Applications closed
          </button>
        ) : (
          <button
            onClick={onApplyClick}
            disabled={applying}
            className="press w-full rounded-pill bg-gradient-primary py-3 text-sm font-semibold text-white shadow-nav disabled:opacity-60"
          >
            {applying ? 'Applying…' : 'Apply to this job'}
          </button>
        )}
      </div>

      {pdfView && (
        <PdfModal
          url={pdfView.url}
          name={pdfView.name}
          onClose={() => {
            setPdfView(null);
          }}
        />
      )}
      {formOpen && (
        <ApplyModal
          job={job}
          submitting={applying}
          onCancel={() => setFormOpen(false)}
          onSubmit={(responses) => apply(responses)}
        />
      )}
      {eligibilityOpen && job && (
        <EligibilityCheckModal
          job={job}
          open
          onClose={() => setEligibilityOpen(false)}
          onEligible={() => {
            setEligibilityOpen(false);
            continueApply();
          }}
        />
      )}
    </div>
  );
}

function Meta({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-subtle">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-danger' : 'text-strong'}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium text-strong">{value}</dd>
    </div>
  );
}
