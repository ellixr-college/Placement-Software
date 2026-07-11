'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card } from '@ellixr/ui';
import { listJobs, publishManyJobs, type Job } from '../../../lib/jobs';
import { JobCard } from '../../../components/job-card';
import { ListSkeleton } from '../../../components/page-skeleton';

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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Clear selection when switching tabs so stale ids don't persist.
  useEffect(() => {
    setSelected(new Set());
  }, [status]);

  const draftIds = useMemo(
    () => items.filter((j) => j.status === 'DRAFT' && !j.isPlatform).map((j) => j.id),
    [items],
  );
  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllDrafts() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allDraftsSelected) {
        for (const id of draftIds) next.delete(id);
      } else {
        for (const id of draftIds) next.add(id);
      }
      return next;
    });
  }

  async function handlePublishSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setPublishing(true);
    setError(null);
    try {
      const { count } = await publishManyJobs(ids);
      setSelected(new Set());
      setItems(await listJobs(status));
      // eslint-disable-next-line no-alert
      alert(`${count} job${count === 1 ? '' : 's'} published successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish selected jobs');
    } finally {
      setPublishing(false);
    }
  }

  const selectedCount = selected.size;

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

      <div className="flex flex-wrap items-center justify-between gap-4">
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

        {selectedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-card">
            <span className="text-sm font-medium text-strong">
              {selectedCount} selected
            </span>
            <Button
              size="sm"
              onClick={handlePublishSelected}
              disabled={publishing}
            >
              {publishing ? 'Publishing…' : 'Publish all'}
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={publishing}
              className="text-xs font-medium text-subtle hover:text-body disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Tip for officers */}
      {!loading && draftIds.length > 0 && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Tip:</span> Draft jobs are not visible to
          students. Select drafts and tap <span className="font-medium text-strong">Publish all</span>{' '}
          to make them live.
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">
          No jobs yet. Post one to get started.
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((j, i) => {
            const applicants = j.applicationCount ?? 0;
            const isDraft = j.status === 'DRAFT' && !j.isPlatform;
            return (
              <JobCard
                key={j.id}
                job={j}
                delay={i * 60}
                hideCtc
                onOpen={() => router.push(`/jobs/${j.id}`)}
                selection={
                  isDraft ? (
                    <label
                      className="flex cursor-pointer items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        checked={selected.has(j.id)}
                        onChange={() => toggleOne(j.id)}
                      />
                    </label>
                  ) : undefined
                }
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

      {/* Floating select-all bar for drafts */}
      {status !== 'PUBLISHED' && status !== 'CLOSED' && draftIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-body">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
              checked={allDraftsSelected}
              onChange={toggleAllDrafts}
            />
            Select all draft jobs
          </label>
          <span className="text-xs text-subtle">({draftIds.length} drafts)</span>
        </div>
      )}
    </div>
  );
}
