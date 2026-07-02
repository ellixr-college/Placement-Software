'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import { applyToJob, formatCtc, getJobFeed, type ApplicationField, type Job } from '../../../../lib/jobs';
import { PdfModal } from '../../../../components/pdf-modal';

/**
 * Student job feed (mobile). Shows only PUBLISHED jobs the authenticated student
 * is eligible for — eligibility is enforced server-side; this is just the view.
 */
export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [formJob, setFormJob] = useState<Job | null>(null);
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
  function onApplyClick(j: Job) {
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
        <p className="text-sm text-subtle">{jobs.length} opening{jobs.length === 1 ? '' : 's'} at your college</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {pdfView && (
        <PdfModal url={pdfView.url} name={pdfView.name} onClose={() => setPdfView(null)} />
      )}

      {formJob && (
        <ApplyModal
          job={formJob}
          submitting={applyingId === formJob.id}
          onCancel={() => setFormJob(null)}
          onSubmit={(responses) => apply(formJob.id, responses)}
        />
      )}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : jobs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">
          No jobs posted at your college yet. Check back soon.
        </Card>
      ) : (
        jobs.map((j) => {
          const notEligible = j.eligible === false;
          const expired = !!j.applicationDeadline && new Date(j.applicationDeadline).getTime() < Date.now();
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
              {j.pdfUrl && (
                <button
                  onClick={() => setPdfView({ url: j.pdfUrl!, name: j.pdfName })}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
                >
                  📄 View job description (PDF)
                </button>
              )}

              {notEligible && !j.applied && (
                <div className="rounded-md border border-cream/60 bg-tint-cream/40 px-3 py-2 text-xs text-tint-cream-fg">
                  <span className="font-medium">You can&apos;t apply to this one yet.</span>{' '}
                  {(j.eligibilityReasons ?? []).filter((r) => r !== 'Profile not verified').join(' · ') ||
                    'You don&apos;t meet the criteria.'}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-strong">{formatCtc(j.ctcMin, j.ctcMax)}</span>
                {j.applied ? (
                  <Button size="sm" variant="ghost" disabled>Applied</Button>
                ) : expired ? (
                  <Button size="sm" variant="ghost" disabled>Closed</Button>
                ) : notEligible ? (
                  <Button size="sm" variant="ghost" disabled>Not eligible</Button>
                ) : (
                  <Button size="sm" disabled={applyingId === j.id} onClick={() => onApplyClick(j)}>
                    {applyingId === j.id ? 'Applying…' : 'Apply'}
                  </Button>
                )}
              </div>
              {j.applicationDeadline && (
                <p className={`text-xs ${expired ? 'font-medium text-danger' : 'text-subtle'}`}>
                  {expired ? 'Applications closed' : 'Apply by'}{' '}
                  {new Date(j.applicationDeadline).toLocaleDateString()}
                </p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

const fieldCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

function ApplyModal({
  job,
  submitting,
  onCancel,
  onSubmit,
}: {
  job: Job;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (responses: Record<string, string>) => void;
}) {
  const fields = job.applicationFormFields ?? [];
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function set(id: string, value: string) {
    setResponses((r) => ({ ...r, [id]: value }));
  }

  function submit() {
    for (const f of fields) {
      if (f.required && !(responses[f.id] ?? '').trim()) {
        setError(`"${f.label}" is required`);
        return;
      }
    }
    setError(null);
    onSubmit(responses);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto p-5">
        <div>
          <h2 className="text-lg font-semibold text-strong">Apply to {job.title}</h2>
          <p className="text-sm text-subtle">
            {job.companyName ?? job.company?.name} · a few questions before you apply
          </p>
        </div>

        {fields.map((f: ApplicationField) => (
          <label key={f.id} className="block space-y-1">
            <span className="text-xs font-medium text-subtle">
              {f.label}
              {f.required && <span className="text-danger"> *</span>}
            </span>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                className={fieldCls}
                value={responses[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
              />
            ) : f.type === 'select' ? (
              <select
                className={fieldCls}
                value={responses[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                className={fieldCls}
                value={responses[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
              />
            )}
          </label>
        ))}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit} loading={submitting}>
            {submitting ? 'Applying…' : 'Submit application'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
