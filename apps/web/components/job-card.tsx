'use client';

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
 * Colourful job card used on the officer Jobs list, platform list and student
 * feed. The whole card is clickable via `onOpen` (natural flow → detail); the
 * `footer` slot is isolated from that click so its buttons (Apply/Details) work.
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
  const accent = ACCENTS[hash(job.id) % ACCENTS.length];
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const chips = [
    jobTypeLabel(job.jobType),
    workModeLabel(job.workMode),
    job.eligibleCourses?.[0],
  ].filter(Boolean) as string[];

  return (
    <div
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => (e.key === 'Enter' || e.key === ' ') && onOpen() : undefined}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`animate-rise flex flex-col gap-4 rounded-2xl ${accent} p-5 shadow-card ${
        onOpen ? 'press cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-400' : ''
      }`}
    >
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
          <h3 className="mt-0.5 text-lg font-bold leading-snug text-strong">{job.title}</h3>
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

      {/* footer: pay + location + CTA (CTA isolated from the card click) */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/5 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-strong">{formatCtc(job.ctcMin, job.ctcMax)}</p>
          <p className="truncate text-xs text-subtle">
            {job.location || 'Location N/A'}
            {deadline ? ` · apply by ${deadline.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </div>
  );
}
