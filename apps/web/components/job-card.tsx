'use client';

import Link from 'next/link';
import { formatCtc, type Job } from '../lib/jobs';

// Soft pastel backgrounds, picked deterministically per job (like the reference).
const ACCENTS = [
  'bg-orange-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-sky-50',
  'bg-rose-50',
  'bg-amber-50',
];
const hash = (s: string) => [...s].reduce((n, c) => n + c.charCodeAt(0), 0);

const jobTypeLabel = (t: string) =>
  t === 'FULL_TIME' ? 'Full time' : t === 'INTERNSHIP' ? 'Internship' : 'Internship + PPO';
const workModeLabel = (m: string | null) =>
  !m ? null : m === 'ONSITE' ? 'On-site' : m.charAt(0) + m.slice(1).toLowerCase();

function postedAgo(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-body ring-1 ring-black/5">
      {children}
    </span>
  );
}

/**
 * Colourful job card used on both the officer Jobs list and the student feed.
 * `topRight` (status / applied badge) and `footer` (Details / Apply CTA) are
 * provided by each screen; the visual shell + core data are shared.
 */
export function JobCard({
  job,
  href,
  topRight,
  footer,
  children,
}: {
  job: Job;
  href?: string;
  topRight?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const company = job.companyName ?? job.company?.name ?? 'Company';
  const accent = ACCENTS[hash(job.id) % ACCENTS.length];
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const chips = [
    jobTypeLabel(job.jobType),
    workModeLabel(job.workMode),
    job.eligibleCourses?.[0],
  ].filter(Boolean) as string[];

  const Title = href ? (
    <Link href={href} className="hover:underline">
      {job.title}
    </Link>
  ) : (
    job.title
  );

  return (
    <div className={`flex flex-col gap-4 rounded-2xl ${accent} p-5 shadow-card`}>
      {/* top: posted pill + status/badge slot */}
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-body">
          {job.publishedAt ? postedAgo(job.publishedAt) : postedAgo(job.createdAt)}
        </span>
        {topRight}
      </div>

      {/* company + title + logo */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-body">{company}</p>
          <h3 className="mt-0.5 text-lg font-bold leading-snug text-strong">{Title}</h3>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-strong shadow-sm">
          {company.trim().charAt(0).toUpperCase() || '·'}
        </div>
      </div>

      {/* chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </div>
      )}

      {children}

      {/* footer: pay + location + CTA */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/5 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-strong">{formatCtc(job.ctcMin, job.ctcMax)}</p>
          <p className="truncate text-xs text-subtle">
            {job.location || 'Location N/A'}
            {deadline ? ` · apply by ${deadline.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
        {footer}
      </div>
    </div>
  );
}
