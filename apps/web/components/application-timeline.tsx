'use client';

import type { Application } from '../lib/applications';

type StepState = 'done' | 'current' | 'rejected' | 'upcoming';

interface Step {
  label: string;
  sub?: string;
  when?: string | null;
  state: StepState;
}

function buildSteps(app: Application): Step[] {
  const steps: Step[] = [
    { label: 'Applied', sub: 'Application submitted', when: app.appliedAt, state: 'done' },
  ];

  for (const r of app.rounds) {
    let state: StepState;
    let sub: string;
    if (r.outcome === 'ADVANCED') {
      state = 'done';
      sub = 'Cleared this round';
    } else if (r.outcome === 'REJECTED') {
      state = 'rejected';
      sub = 'Not selected';
    } else {
      state = 'current';
      sub = r.roundStatus === 'OPEN' ? 'In progress' : 'Awaiting result';
    }
    steps.push({ label: r.title, sub, when: r.scheduledAt, state });
  }

  const someRejected = app.rounds.some((r) => r.outcome === 'REJECTED');
  if (app.status === 'SELECTED') steps.push({ label: 'Selected', sub: 'You got the offer 🎉', state: 'done' });
  else if (app.status === 'WITHDRAWN') steps.push({ label: 'Withdrawn', sub: 'You withdrew', state: 'rejected' });
  else if (app.status === 'REJECTED') {
    if (!someRejected) steps.push({ label: 'Not selected', sub: 'Better luck next time', state: 'rejected' });
  } else steps.push({ label: 'Result', sub: 'Pending decision', state: 'upcoming' });

  return steps;
}

/** Delivery-tracking style vertical timeline for an application. */
export function ApplicationTimeline({ app }: { app: Application }) {
  const steps = buildSteps(app);
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="animate-rise flex gap-3" style={{ animationDelay: `${i * 60}ms` }}>
            {/* date / time */}
            <div className="w-16 shrink-0 pt-0.5 text-right">
              <p className="text-xs font-semibold text-strong">{s.when ? fmtDate(s.when) : ''}</p>
              <p className="text-[10px] text-subtle">{s.when ? fmtTime(s.when) : ''}</p>
            </div>

            {/* dot + connector */}
            <div className="flex flex-col items-center">
              <Dot state={s.state} />
              {!last && (
                <span
                  className={`w-0.5 flex-1 ${s.state === 'done' ? 'bg-success/40' : 'bg-border'}`}
                />
              )}
            </div>

            {/* content */}
            <div className={`pb-6 ${last ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold ${labelColor(s.state)}`}>{s.label}</p>
              {s.sub && <p className="text-xs text-subtle">{s.sub}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Dot({ state }: { state: StepState }) {
  const base = 'flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white';
  if (state === 'done') return <span className={`${base} bg-success`}>✓</span>;
  if (state === 'rejected') return <span className={`${base} bg-danger`}>✕</span>;
  if (state === 'current')
    return <span className={`${base} animate-pop bg-primary-500 ring-4 ring-primary-500/20`} />;
  return <span className="h-5 w-5 rounded-full border-2 border-border bg-white" />;
}

function labelColor(state: StepState): string {
  if (state === 'rejected') return 'text-danger';
  if (state === 'current') return 'text-primary-700';
  if (state === 'upcoming') return 'text-subtle';
  return 'text-strong';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
