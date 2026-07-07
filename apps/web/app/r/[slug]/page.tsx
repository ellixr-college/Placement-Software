import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PublicResume {
  publicSlug: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
}

// Server-to-server fetch (no auth) against the API's @Public() render endpoint.
async function fetchResume(slug: string): Promise<PublicResume | null> {
  const base = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/v1/public/resumes/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resume = await fetchResume(slug);
  return {
    title: resume ? `${resume.fileName} — Resume` : 'Resume',
    robots: { index: false, follow: false },
  };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resume = await fetchResume(slug);
  if (!resume) notFound();

  return (
    <main className="flex min-h-screen flex-col bg-neutral-200">
      <header className="sticky top-0 z-10 border-b border-neutral-300 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-strong">{resume.fileName}</h1>
            <p className="text-xs text-subtle">Résumé · {(resume.fileSize / 1024).toFixed(1)} KB</p>
          </div>
          <a
            href={resume.fileUrl}
            download={resume.fileName}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            Download PDF
          </a>
        </div>
      </header>
      <div className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl">
          <iframe
            src={resume.fileUrl}
            title={resume.fileName}
            className="h-[calc(100vh-140px)] w-full"
          />
        </div>
      </div>
    </main>
  );
}
