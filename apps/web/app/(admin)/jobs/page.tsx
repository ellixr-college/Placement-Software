'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { formatCtc, listJobs, type Job } from '../../../lib/jobs';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

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

/** Company monogram tile (LinkedIn-style logo placeholder). */
function CompanyLogo({ name }: { name: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-50 text-lg font-bold text-primary-700">
      {name.trim().charAt(0).toUpperCase() || '·'}
    </div>
  );
}

export default function JobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setItems(await listJobs(status));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Jobs</h1>
          <p className="text-sm text-subtle">{items.length} postings</p>
        </div>
        <Link href="/jobs/new"><Button>Post a job</Button></Link>
      </header>

      <div className="flex gap-2">
        {['', 'DRAFT', 'PUBLISHED', 'CLOSED'].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatus(s)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
              status === s ? 'bg-primary-600 text-white' : 'bg-white text-body hover:bg-primary-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No jobs yet. Post one to get started.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((j) => {
            const company = j.companyName ?? j.company?.name ?? 'Company';
            const meta = [workModeLabel(j.workMode), j.location].filter(Boolean).join(' · ');
            return (
              <Link key={j.id} href={`/jobs/${j.id}`} className="block">
                <Card className="flex gap-4 p-4 transition hover:shadow-nav">
                  <CompanyLogo name={company} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-strong">{j.title}</p>
                        <p className="truncate text-sm text-body">{company}</p>
                        {meta && <p className="truncate text-xs text-subtle">{meta}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {j.isPlatform && <Badge tint="lavender">Platform</Badge>}
                        <Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                      <span className="font-medium text-body">{j.jobType.replace(/_/g, ' ')}</span>
                      <span>{formatCtc(j.ctcMin, j.ctcMax)}</span>
                      <span>{j.applicationCount ?? 0} applicant{(j.applicationCount ?? 0) === 1 ? '' : 's'}</span>
                      {j.publishedAt && <span>· {postedAgo(j.publishedAt)}</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
