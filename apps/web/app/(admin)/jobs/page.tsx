'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { listJobs, type Job } from '../../../lib/jobs';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

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

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Applicants</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">No jobs yet.</td></tr>
            ) : (
              items.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/jobs/${j.id}`} className="font-medium text-strong hover:underline">{j.title}</Link>
                      {j.isPlatform && <Badge tint="lavender">Platform</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{j.companyName ?? j.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">{j.jobType.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{j.applicationCount ?? 0}</td>
                  <td className="px-4 py-3"><Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
