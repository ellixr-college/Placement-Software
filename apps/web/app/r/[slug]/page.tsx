import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ResumeData } from '@ellixr/shared';
import { ResumeView } from '../../../components/resume/templates';
import { PrintButton } from '../../../components/resume/print-button';

export const dynamic = 'force-dynamic';

interface PublicResume {
  template: string;
  data: ResumeData;
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
  const name = resume?.data?.fullName?.trim();
  return {
    title: name ? `${name} — Resume` : 'Resume',
    robots: { index: false, follow: false },
  };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resume = await fetchResume(slug);
  if (!resume) notFound();

  return (
    <div className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <PrintButton />
      <div className="mx-auto max-w-[860px] overflow-hidden rounded-lg bg-white shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <ResumeView template={resume.template} data={resume.data} />
      </div>
    </div>
  );
}
