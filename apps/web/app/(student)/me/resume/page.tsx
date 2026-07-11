'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { PageSkeleton } from '../../../../components/page-skeleton';
import {
  deleteMyResume,
  getMyResume,
  updateMyResume,
  uploadMyResume,
  type MyResume,
} from '../../../../lib/resume';

const MAX_BYTES = 1 * 1024 * 1024;

export default function MyResumePage() {
  return (
    <Suspense fallback={<PageSkeleton cardHeight={180} />}>
      <MyResume />
    </Suspense>
  );
}

function MyResume() {
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [resume, setResume] = useState<MyResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setResume(await getMyResume());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resume');
    } finally {
      setLoading(false);
    }
  }

  function selectFile() {
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Resume must be 1 MB or smaller.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const r = await uploadMyResume(file);
      setResume(r);
      if (next && r.fileUrl) {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function togglePublished() {
    if (!resume) return;
    const next = !resume.isPublished;
    setError(null);
    try {
      setResume(await updateMyResume({ isPublished: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    }
  }

  async function remove() {
    if (!resume?.fileUrl) return;
    const ok = await confirm({
      title: 'Delete your resume?',
      message:
        'This removes the uploaded PDF. Your public link will stay empty until you upload a new one.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      setResume(await deleteMyResume());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const publicUrl = resume
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${resume.publicSlug}`
    : '';

  return (
    <div className="space-y-5 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-strong">My resume</h1>
        <p className="text-sm text-subtle">
          Upload your résumé as a PDF and share the public link.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <PageSkeleton cardHeight={180} />
      ) : (
        <Card className="space-y-5 p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileChange}
          />

          {!resume?.fileUrl ? (
            <button
              onClick={selectFile}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-app px-6 py-10 text-center transition hover:border-primary-400 hover:bg-primary-50/30 disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="mb-3 h-10 w-10 text-subtle"
              >
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M17 8l-5-5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="font-medium text-strong">
                {uploading ? 'Uploading…' : 'Click to upload PDF'}
              </p>
              <p className="mt-1 text-xs text-subtle">PDF only · max 1 MB</p>
            </button>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
                      <path
                        d="M14 2v6h6"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-strong">{resume.fileName}</p>
                    <p className="text-xs text-subtle">{(resume.fileSize / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={selectFile} loading={uploading}>
                    Replace
                  </Button>
                  <Button variant="danger" size="sm" onClick={remove}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <iframe src={resume.fileUrl} title="Resume preview" className="h-[400px] w-full" />
              </div>

              <div className="space-y-3 rounded-xl bg-app p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-strong">Public link</span>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
                    <input
                      type="checkbox"
                      checked={resume.isPublished}
                      onChange={togglePublished}
                      className="h-4 w-4 accent-primary-600"
                    />
                    Published
                  </label>
                </div>
                <code className="block truncate rounded-md bg-white px-3 py-2 text-xs text-strong">
                  {publicUrl}
                </code>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(publicUrl)}
                  >
                    Copy link
                  </Button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary-600 hover:underline"
                  >
                    Open public page →
                  </a>
                </div>
                {!resume.isPublished && (
                  <p className="text-xs text-warning">
                    Your public link is hidden. Toggle Published to share it.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
