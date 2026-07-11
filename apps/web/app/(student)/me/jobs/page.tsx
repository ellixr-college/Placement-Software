'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@ellixr/ui';
import { applyToJob, getJobFeed, getJobPdfObjectUrl, type Job } from '../../../../lib/jobs';
import { PdfModal } from '../../../../components/pdf-modal';
import { JobCard } from '../../../../components/job-card';
import { ApplyModal } from '../../../../components/apply-modal';
import { EligibilityCheckModal } from '../../../../components/eligibility-check-modal';
import { InlineSkeleton, ListSkeleton } from '../../../../components/page-skeleton';

type Category = 'ALL' | 'APPLIED' | 'CLOSING_SOON' | 'CLOSED';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'CLOSING_SOON', label: 'Closing soon' },
  { key: 'CLOSED', label: 'Closed' },
];

const WORK_MODES = [
  { key: '', label: 'All modes' },
  { key: 'ONSITE', label: 'On-site' },
  { key: 'HYBRID', label: 'Hybrid' },
  { key: 'REMOTE', label: 'Remote' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isClosingSoon(job: Job): boolean {
  if (!job.applicationDeadline || job.applied) return false;
  const deadline = new Date(job.applicationDeadline).getTime();
  const daysLeft = (deadline - Date.now()) / MS_PER_DAY;
  return daysLeft >= 0 && daysLeft <= 7;
}

function isClosed(job: Job): boolean {
  if (job.status === 'CLOSED') return true;
  if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now())
    return true;
  return false;
}

function matchesCategory(job: Job, category: Category): boolean {
  switch (category) {
    case 'ALL':
      return true;
    case 'APPLIED':
      return job.applied === true;
    case 'CLOSING_SOON':
      return isClosingSoon(job);
    case 'CLOSED':
      return isClosed(job);
    default:
      return true;
  }
}

function emptyMessage(category: Category): string {
  switch (category) {
    case 'APPLIED':
      return "You haven't applied to any jobs yet.";
    case 'CLOSING_SOON':
      return 'No jobs closing in the next 7 days.';
    case 'CLOSED':
      return 'No closed jobs to show.';
    default:
      return 'No jobs posted at your college yet. Check back soon.';
  }
}

/**
 * Student job feed (mobile-first). Browse jobs by category, search, job type,
 * and work mode — similar to LinkedIn / job-portal filters.
 */
export default function StudentJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [formJob, setFormJob] = useState<Job | null>(null);
  const [eligibilityJob, setEligibilityJob] = useState<Job | null>(null);
  const [pdfView, setPdfView] = useState<{ url: string; name?: string | null } | null>(null);

  const [category, setCategory] = useState<Category>('ALL');
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('');

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

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q) {
        const company = (j.companyName ?? j.company?.name ?? '').toLowerCase();
        const title = j.title.toLowerCase();
        if (!company.includes(q) && !title.includes(q)) return false;
      }
      if (workMode && j.workMode !== workMode) return false;
      return matchesCategory(j, category);
    });
  }, [jobs, category, search, workMode]);

  // Always show Apply. If the student isn't eligible yet, collect the missing
  // profile/resume fields in a modal first, then continue to the application.
  function onApplyClick(j: Job) {
    if (j.eligible === false) {
      setEligibilityJob(j);
      return;
    }
    continueApply(j);
  }

  function continueApply(j: Job) {
    if (j.applicationFormFields && j.applicationFormFields.length > 0) {
      setFormJob(j);
    } else {
      apply(j.id);
    }
  }

  async function apply(id: string, responses?: Record<string, string>) {
    setApplyingId(id);
    setError(null);
    try {
      await applyToJob(id, responses);
      setFormJob(null);
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
        <h1 className="text-xl font-semibold text-strong">Jobs</h1>
        {loading ? (
          <InlineSkeleton width="w-24" height="h-4" />
        ) : (
          <p className="text-sm text-subtle">
            {`${filteredJobs.length} opening${filteredJobs.length === 1 ? '' : 's'}`}
          </p>
        )}
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or company"
          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-body placeholder:text-subtle focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle">
          🔍
        </span>
      </div>

      {/* Category tabs */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                category === c.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-body hover:bg-primary-50'
              }`}
            >
              {c.label}
            </button>
          ))}
      </div>

      {/* Work mode filter */}
      <div className="flex flex-wrap gap-2">
        {WORK_MODES.map((m) => (
            <button
              key={m.key || 'ALL_MODES'}
              onClick={() => setWorkMode(m.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                workMode === m.key
                  ? 'bg-strong text-white'
                  : 'bg-white text-body ring-1 ring-border hover:bg-primary-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {pdfView && (
        <PdfModal
          url={pdfView.url}
          name={pdfView.name}
          onClose={() => {
            URL.revokeObjectURL(pdfView.url);
            setPdfView(null);
          }}
        />
      )}

      {formJob && (
        <ApplyModal
          job={formJob}
          submitting={applyingId === formJob.id}
          onCancel={() => setFormJob(null)}
          onSubmit={(responses) => apply(formJob.id, responses)}
        />
      )}

      {eligibilityJob && (
        <EligibilityCheckModal
          job={eligibilityJob}
          open
          onClose={() => setEligibilityJob(null)}
          onEligible={() => {
            const j = eligibilityJob;
            setEligibilityJob(null);
            if (j) continueApply(j);
          }}
        />
      )}

      {loading ? (
        <ListSkeleton />
      ) : filteredJobs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">{emptyMessage(category)}</Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((j, i) => {
            const notEligible = j.eligible === false;
            const expired =
              !!j.applicationDeadline && new Date(j.applicationDeadline).getTime() < Date.now();
            const closed = isClosed(j);
            return (
              <JobCard
                key={j.id}
                job={j}
                delay={i * 60}
                onOpen={() => router.push(`/me/jobs/${j.id}`)}
                topRight={
                  j.applied ? (
                    <Badge tint="mint">{j.myStage ?? 'Applied'}</Badge>
                  ) : closed ? (
                    <Badge tint="lavender">Closed</Badge>
                  ) : undefined
                }
                footer={
                  j.applied ? (
                    <button
                      disabled
                      className="rounded-full bg-app px-4 py-2 text-xs font-semibold text-subtle"
                    >
                      Applied
                    </button>
                  ) : expired || closed ? (
                    <button
                      disabled
                      className="rounded-full bg-app px-4 py-2 text-xs font-semibold text-subtle"
                    >
                      Closed
                    </button>
                  ) : (
                    <button
                      onClick={() => onApplyClick(j)}
                      disabled={applyingId === j.id}
                      className="rounded-full bg-strong px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {applyingId === j.id ? 'Applying…' : 'Apply'}
                    </button>
                  )
                }
              >
                {j.description && (
                  <p className="line-clamp-2 text-sm text-body/90">{j.description}</p>
                )}
                {j.pdfUrl && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setError(null);
                      try {
                        setPdfView({ url: await getJobPdfObjectUrl(j.id), name: j.pdfName });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not open PDF');
                      }
                    }}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                  >
                    📄 View job description (PDF)
                  </button>
                )}
                {notEligible && !j.applied && (
                  <div className="rounded-md bg-app px-3 py-2 text-xs text-body">
                    <span className="font-medium">Tap Apply to complete required details.</span>{' '}
                    {(j.eligibilityReasons ?? [])
                      .filter((r) => r !== 'Profile not verified')
                      .join(' · ') || "You don't meet the criteria."}
                  </div>
                )}
              </JobCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
