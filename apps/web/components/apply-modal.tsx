'use client';

import { useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import type { ApplicationField, Job } from '../lib/jobs';

const fieldCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

/** Shared apply dialog: collects answers to a job's custom application questions
 * (or a plain confirm when there are none). Used by the feed + job detail. */
export function ApplyModal({
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
  const fields = Array.isArray(job.applicationFormFields) ? job.applicationFormFields : [];
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (id: string, value: string) => setResponses((r) => ({ ...r, [id]: value }));

  async function submit() {
    for (const f of fields) {
      if (f.required && !(responses[f.id] ?? '').trim()) {
        setError(`"${f.label}" is required`);
        return;
      }
    }
    setError(null);
    setSubmitError(null);
    try {
      await onSubmit(responses);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not apply. Please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <Card
        className="animate-sheet max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-b-none rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold text-strong">Apply to {job.title}</h2>
          <p className="text-sm text-subtle">
            {job.companyName ?? job.company?.name}
            {fields.length > 0
              ? ' · a few questions before you apply'
              : ' · confirm your application'}
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
        {submitError && <p className="text-sm text-danger">{submitError}</p>}

        <div className="flex gap-2 pt-1">
          <Button className="flex-1 press" onClick={submit} loading={submitting}>
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
