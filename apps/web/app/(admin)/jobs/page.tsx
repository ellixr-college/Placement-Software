'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card } from '@ellixr/ui';
import { listJobs, type Job } from '../../../lib/jobs';
import { JobCard } from '../../../components/job-card';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

export default function JobsPage() {
  const router = useRouter();
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
        <Link href="/jobs/quick">
          <Button>Post a job</Button>
        </Link>
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((j, i) => {
            const applicants = j.applicationCount ?? 0;
            return (
              <JobCard
                key={j.id}
                job={j}
                delay={i * 60}
                hideCtc
                onOpen={() => router.push(`/jobs/${j.id}`)}
                topRight={
                  <div className="flex items-center gap-1.5">
                    {j.isPlatform && <Badge tint="lavender">Platform</Badge>}
                    <Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge>
                  </div>
                }
                footer={
                  <Link href={`/jobs/${j.id}`}>
                    <span className="inline-block rounded-full bg-strong px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                      Details
                    </span>
                  </Link>
                }
              >
                <p className="text-xs text-subtle">
                  {applicants} applicant{applicants === 1 ? '' : 's'}
                  {j.graduationYears?.length ? ` · batch ${j.graduationYears.join(', ')}` : ''}
                </p>
              </JobCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
