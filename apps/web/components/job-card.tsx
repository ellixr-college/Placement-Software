'use client';

import { formatCtc, type Job } from '../lib/jobs';

// Soft decorative blob colours, picked deterministically per job — matches the
// BatchCards look for a consistent design language across the app.
const BLOBS = ['text-sky-300', 'text-emerald-300', 'text-amber-300', 'text-violet-300', 'text-rose-300'];
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
    <span className="rounded-full bg-app px-3 py-1 text-xs font-medium text-body">{children}</span>
  );
}

/**
 * Job card — shares the BatchCards look (white surface, soft blob, gradient
 * monogram badge) so cards read consistently across the app. Fully clickable via
 * `onOpen`; the `footer` slot (Apply / Details) is isolated from that click.
 */
export function JobCard({
  job,
  onOpen,
  topRight,
  footer,
  children,
  delay = 0,
}: {
  job: Job;
  onOpen?: () => void;
  topRight?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
}) {
  const company = job.companyName ?? job.company?.name ?? 'Company';
  const blob = BLOBS[hash(job.id) % BLOBS.length];
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const chips = [
    jobTypeLabel(job.jobType),
    workModeLabel(job.workMode),
    job.eligibleCourses?.[0],
  ].filter(Boolean) as string[];
  const meta = [
    job.location,
    deadline ? `apply by ${deadline.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => (e.key === 'Enter' || e.key === ' ') && onOpen() : undefined}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`animate-rise relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-card ${
        onOpen ? 'press cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-400' : ''
      }`}
    >
      {/* decorative blob */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 opacity-20 ${blob}`}
      >
        <path
          fill="currentColor"
          d="M45.7,-58.9C58.9,-49.3,69.1,-34.8,72.6,-18.7C76.1,-2.6,72.9,15.1,64.3,29.4C55.7,43.7,41.7,54.6,26.1,61.4C10.5,68.2,-6.7,70.9,-22.9,66.4C-39.1,61.9,-54.3,50.2,-63.2,34.8C-72.1,19.4,-74.7,0.3,-70.3,-16.7C-65.9,-33.7,-54.5,-48.6,-40.5,-58C-26.5,-67.4,-9.9,-71.3,4.6,-77.5C19.1,-83.7,38.2,-92.2,45.7,-58.9Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* posted pill + status/badge slot */}
      <div className="relative flex items-start justify-between">
        <span className="rounded-full bg-app px-3 py-1 text-xs font-medium text-subtle">
          {job.publishedAt ? postedAgo(job.publishedAt) : postedAgo(job.createdAt)}
        </span>
        {topRight}
      </div>

      {/* company + title + gradient monogram */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{company}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-strong">{job.title}</h3>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-bold text-white shadow-card">
          {company.trim().charAt(0).toUpperCase() || '·'}
        </span>
      </div>

      {/* chips */}
      {chips.length > 0 && (
        <div className="relative flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </div>
      )}

      {children && <div className="relative">{children}</div>}

      {/* footer: pay + location + CTA (CTA isolated from the card click) */}
      <div className="relative mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-strong">{formatCtc(job.ctcMin, job.ctcMax)}</p>
          {meta && <p className="truncate text-xs text-subtle">{meta}</p>}
        </div>
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </div>
  );
}
