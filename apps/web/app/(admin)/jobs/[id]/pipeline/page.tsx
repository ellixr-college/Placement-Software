'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../../components/confirm-provider';
import { getJob, uploadOfferLetter, type Job } from '../../../../../lib/jobs';
import {
  createRound,
  decideRound,
  deleteRound,
  getFunnel,
  placeApplicant,
  rejectApplicant,
  type Funnel,
  type FunnelRound,
  type FunnelStudent,
} from '../../../../../lib/rounds';

export default function FunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const confirm = useConfirm();
  const [job, setJob] = useState<Job | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showAddRound, setShowAddRound] = useState(false);
  const [placing, setPlacing] = useState<FunnelStudent | null>(null);

  async function load(keepTab = true) {
    try {
      const [j, f] = await Promise.all([job ? Promise.resolve(job) : getJob(id), getFunnel(id)]);
      setJob(j);
      setFunnel(f);
      if (!keepTab || !tab) setTab(defaultTab(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => setPicked(new Set()), [tab]);

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!funnel) return <p className="text-danger">{error ?? 'Not found'}</p>;

  const lastRound = funnel.rounds[funnel.rounds.length - 1];
  const canAddRound = !lastRound || lastRound.status === 'DECIDED';
  const activeRound = funnel.rounds.find((r) => r.id === tab) ?? null;

  const tabs: { key: string; label: string; count: number; tone?: 'open' | 'done' }[] = [
    ...funnel.rounds.map((r) => ({
      key: r.id,
      label: r.title,
      count: r.participants.length,
      tone: r.status === 'OPEN' ? ('open' as const) : ('done' as const),
    })),
    ...(funnel.finalists.length ? [{ key: 'finalists', label: 'Finalists', count: funnel.finalists.length }] : []),
    ...(funnel.placed.length ? [{ key: 'selected', label: 'Selected', count: funnel.placed.length }] : []),
    ...(funnel.pool.length ? [{ key: 'pool', label: 'New applicants', count: funnel.pool.length }] : []),
  ];

  async function addRound(title: string, scheduledAt: string) {
    setBusy(true);
    setError(null);
    try {
      const r = (await createRound(id, {
        title: title.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
      })) as { id: string };
      setShowAddRound(false);
      await load(false);
      setTab(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add round');
    } finally {
      setBusy(false);
    }
  }

  async function decide(round: FunnelRound) {
    const advance = round.participants.filter((p) => picked.has(p.applicationId));
    const reject = round.participants.length - advance.length;
    const ok = await confirm({
      title: `Close ${round.title}?`,
      message: `${advance.length} will advance. The other ${reject} will be marked rejected. This can't be undone.`,
      confirmLabel: 'Advance & close round',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await decideRound(id, round.id, [...picked]);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close round');
    } finally {
      setBusy(false);
    }
  }

  async function removeRound(round: FunnelRound) {
    const ok = await confirm({ title: `Remove ${round.title}?`, confirmLabel: 'Remove', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRound(id, round.id);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove round');
    } finally {
      setBusy(false);
    }
  }

  async function reject(s: FunnelStudent) {
    const ok = await confirm({ title: `Reject ${s.fullName}?`, confirmLabel: 'Reject', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await rejectApplicant(id, s.applicationId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${id}`} className="text-sm text-primary-600 hover:underline">
          ← {job?.title ?? 'Job'}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-strong">Applicants &amp; rounds</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-subtle">
          <span>{funnel.applicantsTotal} applied</span>
          <span>{funnel.inProgress} in progress</span>
          <span className="text-success">{funnel.selectedCount} selected</span>
          <span>{funnel.rejectedCount} rejected</span>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Round stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-primary-600 text-white'
                : 'border border-border bg-white text-body hover:border-primary-400'
            }`}
          >
            {t.tone === 'done' && <span className={tab === t.key ? '' : 'text-success'}>✓</span>}
            {t.tone === 'open' && <span className={tab === t.key ? '' : 'text-warning'}>●</span>}
            {t.label}
            <span className={tab === t.key ? 'opacity-80' : 'text-subtle'}>{t.count}</span>
          </button>
        ))}
        <button
          onClick={() => canAddRound && setShowAddRound(true)}
          disabled={!canAddRound}
          title={canAddRound ? 'Add a round' : 'Decide the current round first'}
          className="rounded-pill border border-dashed border-primary-300 px-4 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add round
        </button>
      </div>

      {showAddRound && (
        <AddRoundForm
          nextLabel={`Round ${funnel.rounds.length + 1}`}
          busy={busy}
          onCancel={() => setShowAddRound(false)}
          onSubmit={addRound}
        />
      )}

      {/* Content */}
      {funnel.rounds.length === 0 && tab !== 'pool' ? (
        <StartCard count={funnel.applicantsTotal} onStart={() => setShowAddRound(true)} />
      ) : activeRound ? (
        <RoundView
          round={activeRound}
          picked={picked}
          setPicked={setPicked}
          busy={busy}
          onDecide={() => decide(activeRound)}
          onRemove={() => removeRound(activeRound)}
          isLast={activeRound.id === lastRound?.id}
        />
      ) : tab === 'finalists' ? (
        <PeopleList
          people={funnel.finalists}
          empty="No finalists yet."
          action={(s) => (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPlacing(s)}>Select / place</Button>
              <Button size="sm" variant="ghost" onClick={() => reject(s)}>Reject</Button>
            </div>
          )}
        />
      ) : tab === 'selected' ? (
        <PeopleList
          people={funnel.placed}
          empty="No one selected yet."
          action={(s) => (
            <div className="flex items-center gap-3">
              {s.offerCtc != null && (
                <span className="text-sm font-medium text-strong">₹{(s.offerCtc / 100000).toFixed(2)} LPA</span>
              )}
              {s.offerLetterUrl ? (
                <a href={s.offerLetterUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary-600 hover:underline">
                  Offer letter
                </a>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setPlacing(s)}>Add offer letter</Button>
              )}
              <Badge tint="mint">Selected</Badge>
            </div>
          )}
        />
      ) : (
        <PeopleList people={funnel.pool} empty="No new applicants." />
      )}

      {placing && (
        <PlaceModal
          jobId={id}
          student={placing}
          onClose={() => setPlacing(null)}
          onDone={async () => {
            setPlacing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function defaultTab(f: Funnel): string {
  const open = f.rounds.find((r) => r.status === 'OPEN');
  if (open) return open.id;
  if (f.finalists.length) return 'finalists';
  const last = f.rounds[f.rounds.length - 1];
  if (last) return last.id;
  if (f.pool.length) return 'pool';
  return '';
}

function StartCard({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <Card className="space-y-3 p-8 text-center">
      <p className="text-sm text-subtle">
        {count} {count === 1 ? 'student has' : 'students have'} applied. Add Round 1 to start
        shortlisting — everyone who applied enters the first round.
      </p>
      <Button onClick={onStart} disabled={count === 0}>Add Round 1</Button>
    </Card>
  );
}

function RoundView({
  round,
  picked,
  setPicked,
  busy,
  onDecide,
  onRemove,
  isLast,
}: {
  round: FunnelRound;
  picked: Set<string>;
  setPicked: (s: Set<string>) => void;
  busy: boolean;
  onDecide: () => void;
  onRemove: () => void;
  isLast: boolean;
}) {
  const open = round.status === 'OPEN';
  const toggle = (idc: string) => {
    const next = new Set(picked);
    if (next.has(idc)) next.delete(idc);
    else next.add(idc);
    setPicked(next);
  };
  const allPicked = round.participants.length > 0 && picked.size === round.participants.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-subtle">
          {round.scheduledAt && (
            <span className={round.overdue ? 'font-medium text-danger' : ''}>
              {round.overdue ? '⚠ Was due ' : 'Scheduled '}
              {new Date(round.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>
        {open && isLast && round.participants.length === 0 && (
          <Button size="sm" variant="ghost" onClick={onRemove}>Remove round</Button>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              {open && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPicked}
                    onChange={() =>
                      setPicked(allPicked ? new Set() : new Set(round.participants.map((p) => p.applicationId)))
                    }
                    className="h-4 w-4 cursor-pointer accent-primary-600"
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Reg No.</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Resume</th>
              <th className="px-4 py-3 font-medium">{open ? 'Advance?' : 'Result'}</th>
            </tr>
          </thead>
          <tbody>
            {round.participants.length === 0 ? (
              <tr>
                <td colSpan={open ? 6 : 5} className="px-4 py-8 text-center text-subtle">
                  No one in this round.
                </td>
              </tr>
            ) : (
              round.participants.map((p) => (
                <tr key={p.applicationId} className="border-b border-border last:border-0 hover:bg-app/60">
                  {open && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={picked.has(p.applicationId)}
                        onChange={() => toggle(p.applicationId)}
                        className="h-4 w-4 cursor-pointer accent-primary-600"
                        aria-label={`Advance ${p.fullName}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-strong">{p.fullName}</td>
                  <td className="px-4 py-3">{p.rollNumber}</td>
                  <td className="px-4 py-3">{p.branch}</td>
                  <td className="px-4 py-3">
                    {p.resumeSlug ? (
                      <a href={`/students/${p.studentId}/resume`} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {open ? (
                      <span className="text-xs text-subtle">pending</span>
                    ) : p.outcome === 'ADVANCED' ? (
                      <Badge tint="mint">Advanced</Badge>
                    ) : (
                      <Badge tint="rose">Rejected</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {open && round.participants.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-pill border border-border bg-white/95 p-2 pl-4 shadow-nav backdrop-blur">
          <span className="text-sm text-body">
            <span className="font-semibold text-strong">{picked.size}</span> advance ·{' '}
            {round.participants.length - picked.size} will be rejected
          </span>
          <Button onClick={onDecide} loading={busy}>
            {isLast ? 'Advance & close' : 'Advance & close round'}
          </Button>
        </div>
      )}
    </div>
  );
}

function PeopleList({
  people,
  empty,
  action,
}: {
  people: FunnelStudent[];
  empty: string;
  action?: (s: FunnelStudent) => React.ReactNode;
}) {
  if (people.length === 0) return <Card className="p-8 text-center text-sm text-subtle">{empty}</Card>;
  return (
    <div className="space-y-2">
      {people.map((s) => (
        <Card key={s.applicationId} className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium text-strong">{s.fullName}</p>
            <p className="text-xs text-subtle">
              {s.rollNumber} · {s.branch}
              {s.resumeSlug && (
                <>
                  {' · '}
                  <a href={`/students/${s.studentId}/resume`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                    resume
                  </a>
                </>
              )}
            </p>
          </div>
          {action?.(s)}
        </Card>
      ))}
    </div>
  );
}

function AddRoundForm({
  nextLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  nextLabel: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (title: string, scheduledAt: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const cls = 'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">Add {nextLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Name (optional)</span>
          <input className={cls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={nextLabel} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Date &amp; time (optional)</span>
          <input type="datetime-local" className={cls} value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-subtle">
        {nextLabel === 'Round 1'
          ? 'Everyone who applied enters this round.'
          : 'Everyone who cleared the previous round enters this round.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onSubmit(title, when ? new Date(when).toISOString() : '')} loading={busy}>
          Add round
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

function PlaceModal({
  jobId,
  student,
  onClose,
  onDone,
}: {
  jobId: string;
  student: FunnelStudent;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ctc, setCtc] = useState(student.offerCtc != null ? String(student.offerCtc) : '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let offerLetterUrl: string | undefined;
      if (file) offerLetterUrl = (await uploadOfferLetter(file)).url;
      await placeApplicant(jobId, student.applicationId, {
        offerCtc: ctc.trim() ? Number(ctc) : undefined,
        offerLetterUrl,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select student');
    } finally {
      setBusy(false);
    }
  }

  const cls = 'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-strong">Select {student.fullName}</h2>
          <p className="text-sm text-subtle">{student.rollNumber} · marks them placed</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Offer CTC (₹/yr, optional)</span>
          <input type="number" className={cls} value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="600000" />
        </label>
        <div className="space-y-1">
          <span className="text-xs font-medium text-subtle">Offer letter PDF (optional)</span>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              {file ? 'Change PDF' : 'Choose PDF…'}
            </Button>
            <span className="truncate text-xs text-subtle">{file ? file.name : 'No file'}</span>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={submit} loading={busy}>Mark selected</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
