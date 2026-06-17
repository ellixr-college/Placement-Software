'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import {
  INTERNSHIP_STATUSES,
  listInternships,
  verifyInternship,
  type Internship,
  type InternshipStatus,
} from '../../../lib/internships';

const STATUS_TINT: Record<InternshipStatus, 'mint' | 'cream' | 'rose'> = {
  VERIFIED: 'mint',
  PENDING: 'cream',
  REJECTED: 'rose',
};

export default function InternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [filter, setFilter] = useState<InternshipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(status = filter) {
    setLoading(true);
    setError(null);
    try {
      setItems(await listInternships(status ?? undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load internships');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter(s: InternshipStatus | null) {
    setFilter(s);
    load(s);
  }

  async function act(i: Internship, action: 'verify' | 'reject', why?: string) {
    setBusyId(i.id);
    setError(null);
    try {
      await verifyInternship(i.id, action, why);
      setRejecting(null);
      setReason('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = items.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Internships</h1>
        <p className="text-sm text-subtle">
          Student-submitted internships{filter == null && pendingCount > 0
            ? ` · ${pendingCount} awaiting verification`
            : ''}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === null} onClick={() => applyFilter(null)}>
          All
        </FilterChip>
        {INTERNSHIP_STATUSES.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => applyFilter(s)}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </FilterChip>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No internships match this filter.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <Card key={i.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-strong">
                    {i.studentName}{' '}
                    <span className="text-xs font-normal text-subtle">· {i.rollNumber}</span>
                  </p>
                  <p className="text-sm text-body">
                    {i.role} @ {i.companyName}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-subtle">
                    {i.location && <span>{i.location}</span>}
                    {i.workMode && <span>{i.workMode}</span>}
                    {(i.startDate || i.endDate) && (
                      <span>
                        {fmt(i.startDate)} – {fmt(i.endDate)}
                      </span>
                    )}
                    {i.isPaid && <span>Paid{i.stipend != null ? ` ₹${i.stipend}/mo` : ''}</span>}
                    {i.isPpo && <span className="font-medium text-primary-600">PPO</span>}
                  </p>
                </div>
                <Badge tint={STATUS_TINT[i.status]}>{i.status}</Badge>
              </div>

              {i.description && <p className="text-sm text-body">{i.description}</p>}
              {i.certificateUrl && (
                <a
                  href={i.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  View certificate →
                </a>
              )}
              {i.status === 'REJECTED' && i.rejectionReason && (
                <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                  Sent back: {i.rejectionReason}
                </p>
              )}

              {rejecting === i.id ? (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Reason (shown to the student)"
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => act(i, 'reject', reason.trim() || undefined)}
                      loading={busyId === i.id}
                    >
                      Confirm reject
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                i.status !== 'VERIFIED' && (
                  <div className="flex gap-2">
                    <Button onClick={() => act(i, 'verify')} loading={busyId === i.id}>
                      Verify
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(i.id)}>
                      Reject
                    </Button>
                  </div>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-pill px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-primary-500 text-white'
          : 'border border-border bg-white text-subtle hover:border-primary-400'
      }`}
    >
      {children}
    </button>
  );
}
