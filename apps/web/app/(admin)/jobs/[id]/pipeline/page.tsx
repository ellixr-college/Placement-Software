'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../../components/confirm-provider';
import { ListSkeleton } from '../../../../../components/page-skeleton';
import { formatLpa, getJob, uploadOfferLetter, type Job } from '../../../../../lib/jobs';
import {
  createRound,
  decideRound,
  deleteRound,
  getFunnel,
  placeApplicant,
  rejectApplicant,
  roundTypeLabel,
  ROUND_TYPES,
  type Funnel,
  type FunnelRound,
  type FunnelStudent,
  type RoundType,
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

  if (loading) return <ListSkeleton />;
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
    ...(funnel.finalists.length
      ? [{ key: 'finalists', label: 'Finalists', count: funnel.finalists.length }]
      : []),
    ...(funnel.placed.length
      ? [{ key: 'selected', label: 'Selected', count: funnel.placed.length }]
      : []),
    ...(funnel.pool.length
      ? [{ key: 'pool', label: 'New applicants', count: funnel.pool.length }]
      : []),
  ];

  async function addRound(input: {
    title: string;
    roundType: RoundType | '';
    description: string;
    scheduledAt: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      const r = (await createRound(id, {
        title: input.title.trim() || undefined,
        roundType: input.roundType || undefined,
        description: input.description.trim() || undefined,
        scheduledAt: input.scheduledAt || undefined,
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
    const ok = await confirm({
      title: `Remove ${round.title}?`,
      confirmLabel: 'Remove',
      destructive: true,
    });
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
    const ok = await confirm({
      title: `Reject ${s.fullName}?`,
      confirmLabel: 'Reject',
      destructive: true,
    });
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

  // Place several finalists at once (mark selected/placed; offer letters can be
  // added per-student afterwards from the Selected tab).
  async function bulkPlace() {
    const ids = [...picked];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Select ${ids.length} student${ids.length === 1 ? '' : 's'}?`,
      message: 'They will be marked selected/placed. You can add offer letters afterwards.',
      confirmLabel: `Select ${ids.length}`,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      for (const appId of ids) await placeApplicant(id, appId, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place students');
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
        <p className="mt-1 text-sm font-medium text-subtle">
          {job ? (job.companyName ?? job.company?.name ?? 'Company') : ''}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-strong">Applicants &amp; rounds</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-subtle">
          <span>{funnel.applicantsTotal} applied</span>
          <span>{funnel.inProgress} in progress</span>
          <span className="text-success">{funnel.selectedCount} selected</span>
          <span>{funnel.rejectedCount} rejected</span>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Visual round-by-round funnel */}
      {funnel.rounds.length > 0 && <FunnelChart funnel={funnel} />}

      {/* Hint when a round must be closed before adding another */}
      {!canAddRound && lastRound && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Close {lastRound.title} first.</span> Select who
          advances, then tap <span className="font-medium text-strong">Advance &amp; close</span>.
          The rest will be rejected.
        </div>
      )}

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
          title={
            canAddRound
              ? 'Add a round'
              : `Close ${lastRound?.title ?? 'the current round'} by selecting who advances first`
          }
          className="rounded-pill border border-dashed border-primary-300 px-4 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canAddRound ? '+ Add round' : `Close ${lastRound?.title ?? 'round'} first`}
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
        <FinalistsTable
          people={funnel.finalists}
          picked={picked}
          setPicked={setPicked}
          busy={busy}
          onBulkPlace={bulkPlace}
          onPlace={(s) => setPlacing(s)}
          onReject={reject}
        />
      ) : tab === 'selected' ? (
        <PeopleList
          people={funnel.placed}
          empty="No one selected yet."
          action={(s) => (
            <div className="flex items-center gap-3">
              {s.offerCtc != null && (
                <span className="text-sm font-medium text-strong">{formatLpa(s.offerCtc)}</span>
              )}
              {s.offerLetterUrl ? (
                <a
                  href={s.offerLetterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Offer letter
                </a>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setPlacing(s)}>
                  Add offer letter
                </Button>
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
      <Button onClick={onStart} disabled={count === 0}>
        Add Round 1
      </Button>
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
          {round.roundType && (
            <span className="mr-2 rounded-md bg-app px-2 py-0.5 text-xs font-medium text-body">
              {roundTypeLabel(round.roundType)}
            </span>
          )}
          {round.scheduledAt && (
            <span className={round.overdue ? 'font-medium text-danger' : ''}>
              {round.overdue ? '⚠ Was due ' : 'Scheduled '}
              {new Date(round.scheduledAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
        {open && isLast && round.participants.length === 0 && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove round
          </Button>
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
                      setPicked(
                        allPicked
                          ? new Set()
                          : new Set(round.participants.map((p) => p.applicationId)),
                      )
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
                <tr
                  key={p.applicationId}
                  className="border-b border-border last:border-0 hover:bg-app/60"
                >
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
                      <a
                        href={`/students/${p.studentId}/resume`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary-600 hover:underline"
                      >
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

      {round.description && (
        <div className="rounded-md bg-app p-3 text-sm text-body">
          <span className="font-medium text-strong">Details:</span> {round.description}
        </div>
      )}

      {open && round.participants.length > 0 && (
        <>
          <p className="text-xs text-subtle">
            Tick students to advance. Unticked students will be rejected when you close the round.
          </p>
          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-pill border border-border bg-white/95 p-2 pl-4 shadow-nav backdrop-blur">
            <span className="text-sm text-body">
              <span className="font-semibold text-strong">{picked.size}</span> advance ·{' '}
              {round.participants.length - picked.size} will be rejected
            </span>
            <Button onClick={onDecide} loading={busy}>
              {isLast ? 'Advance & close' : 'Advance & close round'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Visual selection funnel: how many students carry from stage to stage. */
function FunnelChart({ funnel }: { funnel: Funnel }) {
  const total = Math.max(1, funnel.applicantsTotal);
  const stages: {
    label: string;
    count: number;
    sub?: string;
    tone: 'app' | 'open' | 'done' | 'success';
  }[] = [
    { label: 'Applied', count: funnel.applicantsTotal, tone: 'app' },
    ...funnel.rounds.map((r) => {
      const advanced = r.participants.filter((p) => p.outcome === 'ADVANCED').length;
      return {
        label: r.title,
        count: r.participants.length,
        sub: r.status === 'OPEN' ? 'in progress' : `${advanced} advanced`,
        tone: (r.status === 'OPEN' ? 'open' : 'done') as 'open' | 'done',
      };
    }),
    { label: 'Selected', count: funnel.selectedCount, tone: 'success' },
  ];
  const barTone: Record<string, string> = {
    app: 'bg-primary-300',
    open: 'bg-warning',
    done: 'bg-primary-500',
    success: 'bg-success',
  };

  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm font-semibold text-strong">Round-by-round funnel</p>
      <div className="space-y-2.5">
        {stages.map((s, i) => {
          const prev = i > 0 ? (stages[i - 1]?.count ?? 0) : s.count;
          const dropped = i > 0 && prev - s.count > 0 ? prev - s.count : 0;
          return (
            <div key={`${s.label}-${i}`}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-body">{s.label}</span>
                <span className="text-subtle">
                  <span className="font-semibold text-strong">{s.count}</span>
                  {s.sub ? ` · ${s.sub}` : ''}
                  {dropped > 0 ? <span className="text-danger"> · {dropped} dropped</span> : ''}
                </span>
              </div>
              <div className="h-6 overflow-hidden rounded-md bg-app">
                <div
                  className={`flex h-full items-center rounded-md ${barTone[s.tone]} transition-all`}
                  style={{ width: `${Math.max(4, (s.count / total) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Finalists as a selectable table — multi-select rows and place them in bulk. */
function FinalistsTable({
  people,
  picked,
  setPicked,
  busy,
  onBulkPlace,
  onPlace,
  onReject,
}: {
  people: FunnelStudent[];
  picked: Set<string>;
  setPicked: (s: Set<string>) => void;
  busy: boolean;
  onBulkPlace: () => void;
  onPlace: (s: FunnelStudent) => void;
  onReject: (s: FunnelStudent) => void;
}) {
  if (people.length === 0)
    return <Card className="p-8 text-center text-sm text-subtle">No finalists yet.</Card>;

  const allPicked = people.length > 0 && picked.size === people.length;
  const toggle = (appId: string) => {
    const next = new Set(picked);
    if (next.has(appId)) next.delete(appId);
    else next.add(appId);
    setPicked(next);
  };

  return (
    <div className="space-y-3">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() =>
                    setPicked(allPicked ? new Set() : new Set(people.map((p) => p.applicationId)))
                  }
                  className="h-4 w-4 cursor-pointer accent-primary-600"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Reg No.</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Resume</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map((s) => (
              <tr
                key={s.applicationId}
                className={`border-b border-border last:border-0 hover:bg-app/60 ${
                  picked.has(s.applicationId) ? 'bg-primary-50/50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={picked.has(s.applicationId)}
                    onChange={() => toggle(s.applicationId)}
                    className="h-4 w-4 cursor-pointer accent-primary-600"
                    aria-label={`Select ${s.fullName}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-strong">{s.fullName}</td>
                <td className="px-4 py-3">{s.rollNumber}</td>
                <td className="px-4 py-3">{s.branch}</td>
                <td className="px-4 py-3">
                  {s.resumeSlug ? (
                    <a
                      href={`/students/${s.studentId}/resume`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => onPlace(s)}>
                      Select / place
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onReject(s)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {picked.size > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-pill border border-border bg-white/95 p-2 pl-4 shadow-nav backdrop-blur">
          <span className="text-sm text-body">
            <span className="font-semibold text-strong">{picked.size}</span> selected
          </span>
          <Button onClick={onBulkPlace} loading={busy}>
            Place {picked.size} selected
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
  if (people.length === 0)
    return <Card className="p-8 text-center text-sm text-subtle">{empty}</Card>;
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
                  <a
                    href={`/students/${s.studentId}/resume`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline"
                  >
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
  onSubmit: (input: {
    title: string;
    roundType: RoundType | '';
    description: string;
    scheduledAt: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [roundType, setRoundType] = useState<RoundType | ''>('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const cls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">Add {nextLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Name (optional)</span>
          <input
            className={cls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={nextLabel}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Round type</span>
          <select
            className={cls}
            value={roundType}
            onChange={(e) => setRoundType(e.target.value as RoundType | '')}
          >
            <option value="">Select type</option>
            {ROUND_TYPES.map((t) => (
              <option key={t} value={t}>
                {roundTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-subtle">Description / instructions</span>
        <textarea
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Venue, link, prerequisites, or any other details students should know…"
        />
      </label>
      <label className="block space-y-1 sm:w-1/2">
        <span className="text-xs font-medium text-subtle">Date (optional)</span>
        <input type="date" className={cls} value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <p className="text-xs text-subtle">
        {nextLabel === 'Round 1'
          ? 'Everyone who applied enters this round.'
          : 'Everyone who cleared the previous round enters this round.'}
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() =>
            onSubmit({
              title,
              roundType,
              description,
              scheduledAt: when ? new Date(when).toISOString() : '',
            })
          }
          loading={busy}
        >
          Add round
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
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

  const cls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-strong">Select {student.fullName}</h2>
          <p className="text-sm text-subtle">{student.rollNumber} · marks them placed</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Offer CTC (₹/yr, optional)</span>
          <input
            type="number"
            className={cls}
            value={ctc}
            onChange={(e) => setCtc(e.target.value)}
            placeholder="600000"
            min="0"
          />
        </label>
        <div className="space-y-1">
          <span className="text-xs font-medium text-subtle">Offer letter PDF (optional)</span>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              {file ? 'Change PDF' : 'Choose PDF…'}
            </Button>
            <span className="truncate text-xs text-subtle">{file ? file.name : 'No file'}</span>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={submit} loading={busy}>
            Mark selected
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
