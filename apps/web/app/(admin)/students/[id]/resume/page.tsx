'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudentResume, type OfficerResume } from '../../../../../lib/resume';

/** Officer view of a student's résumé — renders the uploaded PDF. */
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <>
          <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 shadow-card">
            <div>
              <p className="text-sm font-medium text-strong">{resume.fileName}</p>
              <p className="text-xs text-subtle">{(resume.fileSize / 1024).toFixed(1)} KB</p>
            </div>
            <a
              href={resume.fileUrl}
              download={resume.fileName}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              Download PDF
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
            <iframe src={resume.fileUrl} title={resume.fileName} className="h-[75vh] w-full" />
          </div>
        </>
      )}
    </div>
  );
}
