'use client';

import { Button, Card } from '@ellixr/ui';
import type { Job } from '../lib/jobs';

/** Prompt shown when a student taps Apply but their profile/resume is not ready
 * for that job. Gives a single path to complete the profile and upload a resume,
 * then return to the job they wanted. */
export function ProfileIncompleteModal({
  job,
  reasons,
  onCancel,
  onProceed,
}: {
  job: Job;
  reasons?: string[];
  onCancel: () => void;
  onProceed: () => void;
}) {
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
          <h2 className="text-lg font-semibold text-strong">Complete your profile to apply</h2>
          <p className="text-sm text-subtle">
            {job.companyName ?? job.company?.name ?? 'Company'} · {job.title}
          </p>
        </div>

        <p className="text-sm text-body">
          Your profile is incomplete. To apply for this job, please complete your profile details
          and upload your résumé. You can come back and apply once the important parts are filled.
        </p>

        {reasons && reasons.length > 0 && (
          <ul className="list-disc space-y-1 rounded-md bg-app px-4 py-3 text-xs text-body">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <Button className="flex-1 press" onClick={onProceed}>
            Complete profile & upload résumé
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
