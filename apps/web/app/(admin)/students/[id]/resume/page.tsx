'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ResumeView } from '../../../../../components/resume/templates';
import { getStudentResume, type OfficerResume } from '../../../../../lib/resume';

/** Officer view of a student's resume — renders regardless of completeness/publish
 * state (the public /r/:slug page stays gated to complete resumes). */
export default function StudentResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resume, setResume] = useState<OfficerResume | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentResume(id)
      .then(setResume)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load resume'));
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/students/${id}`} className="text-sm text-primary-600 hover:underline">
          ← Back to student
        </Link>
        {resume && !resume.isPublished && (
          <span className="rounded-full bg-tint-cream px-3 py-1 text-xs font-medium text-tint-cream-fg">
            Not published by student
          </span>
        )}
      </div>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !resume ? (
        <p className="text-subtle">Loading…</p>
      ) : (
        <div className="mx-auto max-w-[860px] overflow-hidden rounded-lg bg-white shadow-card">
          <ResumeView template={resume.template} data={resume.data} />
        </div>
      )}
    </div>
  );
}
