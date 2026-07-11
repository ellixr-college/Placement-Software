'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import {
  addInterview,
  changeStage,
  getApplication,
  updateInterview,
  type Application,
} from '../../../../lib/applications';
import { DetailSkeleton } from '../../../../components/page-skeleton';

// Mirror of the backend TRANSITIONS map so the UI only offers legal next stages.
const TRANSITIONS: Record<string, string[]> = {
  APPLIED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['ROUND_1', 'REJECTED'],
  ROUND_1: ['ROUND_2', 'HR', 'OFFER_RELEASED', 'REJECTED'],
  ROUND_2: ['ROUND_3', 'HR', 'OFFER_RELEASED', 'REJECTED'],
  ROUND_3: ['HR', 'OFFER_RELEASED', 'REJECTED'],
  HR: ['OFFER_RELEASED', 'REJECTED'],
  OFFER_RELEASED: ['OFFER_ACCEPTED', 'REJECTED'],
  OFFER_ACCEPTED: ['JOINED'],
  JOINED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const PLACING_STAGES = ['OFFER_ACCEPTED', 'JOINED'];

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setApp(await getApplication(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function advance(stage: string) {
    setError(null);
    const input: { stage: string; note?: string; rejectionReason?: string; offerCtc?: number } = {
      stage,
    };
    if (stage === 'REJECTED') {
      const reason = window.prompt('Reason for rejection?');
      if (!reason) return;
      input.rejectionReason = reason;
    }
    if (PLACING_STAGES.includes(stage)) {
      const ctc = window.prompt('Offer CTC (₹/yr)?');
      if (!ctc) return;
      input.offerCtc = Number(ctc);
    }
    setBusy(true);
    try {
      setApp(await changeStage(id, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stage change failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <DetailSkeleton />;
  if (!app) return <p className="text-danger">{error ?? 'Application not found'}</p>;

  const nextStages = TRANSITIONS[app.stage] ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/jobs/${app.job.id}/pipeline`}
        className="text-sm text-primary-600 hover:underline"
      >
        ← Pipeline
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">
            {app.student?.fullName ?? 'Applicant'}
          </h1>
          <p className="text-sm text-subtle">
            {app.student?.rollNumber} · {app.student?.branch} — applied to{' '}
            <Link href={`/jobs/${app.job.id}`} className="text-primary-600 hover:underline">
              {app.job.title}
            </Link>{' '}
            @ {app.job.company.name}
          </p>
        </div>
        <Badge tint="primary">{app.stage}</Badge>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}
      {app.rejectionReason && (
        <p className="text-sm text-danger">Rejected: {app.rejectionReason}</p>
      )}
      {app.offerCtc != null && (
        <p className="text-sm text-success">Offer: ₹{(app.offerCtc / 100000).toFixed(1)} LPA</p>
      )}

      {/* Stage actions */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-strong">Advance stage</h2>
        {nextStages.length === 0 ? (
          <p className="text-xs text-subtle">This is a terminal stage — no further transitions.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nextStages.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'REJECTED' ? 'outline' : 'primary'}
                disabled={busy}
                onClick={() => advance(s)}
              >
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {app.formAnswers && app.formAnswers.length > 0 && (
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-strong">Application responses</h2>
          <dl className="space-y-2">
            {app.formAnswers.map((a, i) => (
              <div key={i}>
                <dt className="text-xs uppercase text-subtle">{a.label}</dt>
                <dd className="text-sm text-strong">{a.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <InterviewsCard app={app} onChanged={load} />

      {/* Stage history */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-strong">Stage history</h2>
        {app.stageHistory.length === 0 ? (
          <p className="text-xs text-subtle">No history yet.</p>
        ) : (
          <ol className="space-y-2">
            {app.stageHistory.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                <div>
                  <p className="text-strong">
                    {h.fromStage ? `${h.fromStage} → ` : ''}
                    {h.toStage}
                  </p>
                  <p className="text-xs text-subtle">
                    {new Date(h.createdAt).toLocaleString()}
                    {h.note ? ` · ${h.note}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

const RESULTS = ['PENDING', 'PASSED', 'FAILED', 'NO_SHOW'];

function InterviewsCard({ app, onChanged }: { app: Application; onChanged: () => void }) {
  const [form, setForm] = useState({ roundName: '', scheduledAt: '', mode: '', location: '' });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      await addInterview(app.id, {
        roundName: form.roundName,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        mode: form.mode || undefined,
        location: form.location || undefined,
      });
      setForm({ roundName: '', scheduledAt: '', mode: '', location: '' });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function setResult(roundId: string, result: string) {
    setBusy(true);
    try {
      await updateInterview(app.id, roundId, { result });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-sm font-semibold text-strong">Interview rounds</h2>
      {app.interviews.length === 0 && <p className="text-xs text-subtle">No rounds scheduled.</p>}
      {app.interviews.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between border-b border-border pb-2 last:border-0"
        >
          <div>
            <p className="text-sm font-medium text-strong">{r.roundName}</p>
            <p className="text-xs text-subtle">
              {[r.scheduledAt && new Date(r.scheduledAt).toLocaleString(), r.mode, r.location]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          </div>
          <select
            className="h-8 rounded-md border border-border bg-white px-2 text-xs outline-none focus:border-primary-400"
            value={r.result}
            disabled={busy}
            onChange={(e) => setResult(r.id, e.target.value)}
          >
            {RESULTS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Round name *"
          value={form.roundName}
          onChange={(e) => setForm({ ...form, roundName: e.target.value })}
        />
        <input
          className={inputCls}
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Mode (e.g. Online)"
          value={form.mode}
          onChange={(e) => setForm({ ...form, mode: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Location / link"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>
      <Button size="sm" onClick={add} disabled={busy || !form.roundName.trim()}>
        Add round
      </Button>
    </Card>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
