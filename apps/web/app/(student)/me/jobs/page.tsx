'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@ellixr/ui';
import { applyToJob, getJobFeed, getJobPdfObjectUrl, type Job } from '../../../../lib/jobs';
import { PdfModal } from '../../../../components/pdf-modal';
import { JobCard } from '../../../../components/job-card';
import { ApplyModal } from '../../../../components/apply-modal';
import { ProfileIncompleteModal } from '../../../../components/profile-incomplete-modal';

/** Reasons that can be fixed by completing the profile / uploading a resume. */
function isProfileBlocker(reason: string): boolean {
  const profileReasons = new Set(['Resume not uploaded', 'Profile not verified', 'Gender not set']);
  if (profileReasons.has(reason)) return true;
  return (
    reason.startsWith('Percentage below') ||
    reason.startsWith('10th below') ||
    reason.startsWith('12th below') ||
    reason.startsWith('UG below')
  );
}

/**
 * Student job feed (mobile). Lists every PUBLISHED job at the student’s college
 * and lets them apply once their profile + resume are complete enough.
 */
export default function StudentJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [formJob, setFormJob] = useState<Job | null>(null);
  const [incompleteJob, setIncompleteJob] = useState<Job | null>(null);
  const [pdfView, setPdfView] = useState<{ url: string; name?: string | null } | null>(null);

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

  // Jobs with a custom application form open a modal first; others apply directly.
  // If the student isn't eligible yet, guide them to complete their profile first.
  function onApplyClick(j: Job) {
    if (j.eligible === false) {
      setIncompleteJob(j);
      return;
    }
    if (j.applicationFormFields && j.applicationFormFields.length > 0) {
      setFormJob(j);
    } else {
      apply(j.id);
    }
  }

  function proceedToProfile(jobId: string) {
    setIncompleteJob(null);
    router.push(`/me/profile/edit?next=/me/jobs/${jobId}`);
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
        <p className="text-sm text-subtle">
          {jobs.length} opening{jobs.length === 1 ? '' : 's'} at your college
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

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

      {incompleteJob && (
        <ProfileIncompleteModal
          job={incompleteJob}
          reasons={incompleteJob.eligibilityReasons}
          onCancel={() => setIncompleteJob(null)}
          onProceed={() => proceedToProfile(incompleteJob.id)}
        />
      )}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : jobs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">
          No jobs posted at your college yet. Check back soon.
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((j, i) => {
            const notEligible = j.eligible === false;
            const expired =
              !!j.applicationDeadline && new Date(j.applicationDeadline).getTime() < Date.now();
            const onlyProfileBlockers =
              notEligible && (j.eligibilityReasons ?? []).every(isProfileBlocker);
            return (
              <JobCard
                key={j.id}
                job={j}
                delay={i * 60}
                onOpen={() => router.push(`/me/jobs/${j.id}`)}
                topRight={
                  j.applied ? <Badge tint="mint">{j.myStage ?? 'Applied'}</Badge> : undefined
                }
                footer={
                  j.applied ? (
                    <button
                      disabled
                      className="rounded-full bg-app px-4 py-2 text-xs font-semibold text-subtle"
                    >
                      Applied
                    </button>
                  ) : expired ? (
                    <button
                      disabled
                      className="rounded-full bg-app px-4 py-2 text-xs font-semibold text-subtle"
                    >
                      Closed
                    </button>
                  ) : notEligible && !onlyProfileBlockers ? (
                    <button
                      disabled
                      className="rounded-full bg-app px-4 py-2 text-xs font-semibold text-subtle"
                    >
                      Not eligible
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
                    <span className="font-medium">
                      {onlyProfileBlockers
                        ? 'Complete your profile to apply.'
                        : "You can't apply yet."}
                    </span>{' '}
                    {(j.eligibilityReasons ?? [])
                      .filter((r) => r !== 'Profile not verified')
                      .join(' · ') || 'You don&apos;t meet the criteria.'}
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
