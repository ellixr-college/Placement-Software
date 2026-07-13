'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@ellixr/ui';
import { applyToJob, getJobFeed, type Job } from '../../../../lib/jobs';
import { mutate } from '../../../../lib/use-api';
import { PdfModal } from '../../../../components/pdf-modal';
import { JobCard } from '../../../../components/job-card';
import { ApplyModal } from '../../../../components/apply-modal';
import { EligibilityCheckModal } from '../../../../components/eligibility-check-modal';
import { InlineSkeleton, ListSkeleton } from '../../../../components/page-skeleton';
import { useApi } from '../../../../lib/use-api';

type Category = 'ALL' | 'APPLIED' | 'CLOSING_SOON' | 'CLOSED';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'CLOSING_SOON', label: 'Closing soon' },
  { key: 'CLOSED', label: 'Closed' },
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
      // Only show open jobs the student has not applied to.
      return !isClosed(job) && !job.applied;
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
      return 'No open jobs to apply right now. Check back soon.';
  }
}

const JOBS_KEY = '/student/jobs';

/**
 * Student job feed (mobile-first). Browse jobs by category and search by company.
 */
export default function StudentJobsPage() {
  const router = useRouter();
  const { data: jobs, error, isLoading } = useApi<Job[]>(JOBS_KEY, getJobFeed);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [formJob, setFormJob] = useState<Job | null>(null);
  const [eligibilityJob, setEligibilityJob] = useState<Job | null>(null);
  const [pdfView, setPdfView] = useState<{ url: string; name?: string | null } | null>(null);

  const [category, setCategory] = useState<Category>('ALL');
  const [search, setSearch] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q) {
        const company = (j.companyName ?? j.company?.name ?? '').toLowerCase();
        if (!company.includes(q)) return false;
      }
      return matchesCategory(j, category);
    });
  }, [jobs, category, search]);

  function onApplyClick(j: Job) {
    if (j.eligible === false) {
      setEligibilityJob(j);
      return;
    }
    continueApply(j);
  }

  function continueApply(j: Job) {
    if (Array.isArray(j.applicationFormFields) && j.applicationFormFields.length > 0) {
      setFormJob(j);
    } else {
      apply(j.id).catch((err) =>
        setApplyError(err instanceof Error ? err.message : 'Could not apply to this job'),
      );
    }
  }

  async function apply(id: string, responses?: Record<string, string>) {
    setApplyingId(id);
    try {
      await applyToJob(id, responses);
      setFormJob(null);
      setApplyError(null);
      // Refetch jobs and the home dashboard application counts.
      await mutate(JOBS_KEY);
      await mutate('/student/applications');
    } catch (err) {
      // Re-throw so modals can show the error inline.
      throw err;
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-strong">Jobs</h1>
        {isLoading ? (
          <InlineSkeleton width="w-24" height="h-4" />
        ) : (
          <p className="text-sm text-subtle">
            {`${filteredJobs.length} opening${filteredJobs.length === 1 ? '' : 's'}`}
          </p>
        )}
      </header>

      {error && <p className="text-sm text-danger">{error.message}</p>}
      {applyError && <p className="text-sm text-danger">{applyError}</p>}

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company"
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
      </div>

      {pdfView && (
        <PdfModal url={pdfView.url} name={pdfView.name} onClose={() => setPdfView(null)} />
      )}

      {formJob && (
        <ApplyModal
          job={formJob}
          submitting={applyingId === formJob.id}
          onCancel={() => {
            setFormJob(null);
            setApplyError(null);
          }}
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

      {isLoading ? (
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
                      try {
                        setPdfView({ url: j.pdfUrl!, name: j.pdfName });
                      } catch (err) {
                        // Surface inline if the modal can't open.
                        alert(err instanceof Error ? err.message : 'Could not open PDF');
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
