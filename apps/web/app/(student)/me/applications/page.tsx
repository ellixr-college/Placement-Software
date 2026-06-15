'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import {
  listMyApplications,
  withdrawApplication,
  type Application,
} from '../../../../lib/applications';

const TERMINAL = ['JOINED', 'REJECTED', 'WITHDRAWN'];

/**
 * Student "my applications" (mobile). Each card shows the live ATS stage,
 * interview rounds, any offer, and a withdraw action while still in progress.
 */
export default function MyApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setApps(await listMyApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(id: string) {
    if (!window.confirm('Withdraw this application? This cannot be undone.')) return;
    setBusyId(id);
    setError(null);
    try {
      await withdrawApplication(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not withdraw');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-strong">My applications</h1>
        <p className="text-sm text-subtle">{apps.length} application(s)</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : apps.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">You haven't applied to any jobs yet.</Card>
      ) : (
        apps.map((a) => (
          <Card key={a.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-strong">{a.job.title}</h2>
                <p className="text-sm text-subtle">{a.job.company.name}</p>
              </div>
              <Badge tint={a.stage === 'REJECTED' ? 'lavender' : 'mint'}>{a.stage.replace('_', ' ')}</Badge>
            </div>

            {a.offerCtc != null && (
              <p className="text-sm font-medium text-success">Offer: ₹{(a.offerCtc / 100000).toFixed(1)} LPA</p>
            )}
            {a.rejectionReason && <p className="text-sm text-danger">Reason: {a.rejectionReason}</p>}

            {a.interviews.length > 0 && (
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-xs font-semibold uppercase text-subtle">Interviews</p>
                {a.interviews.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-strong">{r.roundName}</span>
                    <span className="text-xs text-subtle">
                      {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : '—'} · {r.result}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!TERMINAL.includes(a.stage) && (
              <div className="flex justify-end">
                <button
                  onClick={() => withdraw(a.id)}
                  disabled={busyId === a.id}
                  className="text-xs text-danger hover:underline"
                >
                  {busyId === a.id ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
