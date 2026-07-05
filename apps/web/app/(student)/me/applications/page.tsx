'use client';

import { useEffect, useState } from 'react';
import { Badge, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { listMyApplications, withdrawApplication, type Application } from '../../../../lib/applications';

type StepState = 'done' | 'current' | 'rejected' | 'upcoming';

const STATUS: Record<string, { label: string; tint: 'mint' | 'rose' | 'cream' | 'lavender' }> = {
  APPLIED: { label: 'Applied', tint: 'cream' },
  IN_PROGRESS: { label: 'In progress', tint: 'lavender' },
  SELECTED: { label: 'Selected', tint: 'mint' },
  REJECTED: { label: 'Not selected', tint: 'rose' },
  WITHDRAWN: { label: 'Withdrawn', tint: 'cream' },
};

export default function MyApplicationsPage() {
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: 'Withdraw this application?',
      message: 'You will be removed from this job. This cannot be undone.',
      acknowledgement: 'I understand I can’t re-apply.',
      confirmLabel: 'Withdraw',
      destructive: true,
    });
    if (!ok) return;
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
        <Card className="p-6 text-center text-sm text-subtle">You haven&apos;t applied to any jobs yet.</Card>
      ) : (
        apps.map((a) => {
          const st = STATUS[a.status] ?? { label: a.status, tint: 'cream' as const };
          const canWithdraw = a.status === 'APPLIED' || a.status === 'IN_PROGRESS';
          return (
            <Card key={a.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-strong">{a.job.title}</h2>
                  <p className="text-sm text-subtle">{a.job.company.name}</p>
                </div>
                <Badge tint={st.tint}>{st.label}</Badge>
              </div>

              <Timeline app={a} />

              {a.status === 'SELECTED' && (
                <div className="flex flex-wrap items-center gap-3 rounded-md bg-success/10 px-3 py-2">
                  <span className="text-sm font-medium text-success">🎉 You&apos;ve been selected!</span>
                  {a.offerCtc != null && (
                    <span className="text-sm text-body">₹{(a.offerCtc / 100000).toFixed(2)} LPA</span>
                  )}
                  {a.offerLetterUrl && (
                    <a href={a.offerLetterUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary-600 hover:underline">
                      View offer letter
                    </a>
                  )}
                </div>
              )}

              {canWithdraw && (
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
          );
        })
      )}
    </div>
  );
}

/** Delivery-tracking style vertical timeline: Applied → rounds → result. */
function Timeline({ app }: { app: Application }) {
  const steps: { label: string; sub?: string; state: StepState }[] = [
    { label: 'Applied', sub: fmt(app.appliedAt), state: 'done' },
  ];

  for (const r of app.rounds) {
    let state: StepState;
    if (r.outcome === 'ADVANCED') state = 'done';
    else if (r.outcome === 'REJECTED') state = 'rejected';
    else state = 'current'; // pending
    steps.push({ label: r.title, sub: r.scheduledAt ? fmt(r.scheduledAt) : undefined, state });
  }

  const lastRejected = app.rounds.some((r) => r.outcome === 'REJECTED');
  if (app.status === 'SELECTED') steps.push({ label: 'Selected', state: 'done' });
  else if (app.status === 'WITHDRAWN') steps.push({ label: 'Withdrawn', state: 'rejected' });
  else if (app.status === 'REJECTED') {
    if (!lastRejected) steps.push({ label: 'Not selected', state: 'rejected' });
  } else steps.push({ label: 'Result', state: 'upcoming' });

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {/* connector */}
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[7px] top-4 h-full w-0.5 ${
                s.state === 'done' ? 'bg-success/40' : 'bg-border'
              }`}
            />
          )}
          <Dot state={s.state} />
          <div className="-mt-0.5">
            <p className={`text-sm font-medium ${labelColor(s.state)}`}>{s.label}</p>
            {s.sub && <p className="text-xs text-subtle">{s.sub}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Dot({ state }: { state: StepState }) {
  const base = 'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full';
  if (state === 'done') return <span className={`${base} bg-success text-[9px] text-white`}>✓</span>;
  if (state === 'rejected') return <span className={`${base} bg-danger text-[9px] text-white`}>✕</span>;
  if (state === 'current')
    return <span className={`${base} bg-primary-500 ring-4 ring-primary-500/20`} />;
  return <span className={`${base} border-2 border-border bg-white`} />;
}

function labelColor(state: StepState): string {
  if (state === 'rejected') return 'text-danger';
  if (state === 'current') return 'text-primary-700';
  if (state === 'upcoming') return 'text-subtle';
  return 'text-strong';
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
