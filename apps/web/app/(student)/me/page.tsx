'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@ellixr/ui';
import { getOwnStudent, type Student } from '../../../lib/students';
import { listMyApplications, type Application } from '../../../lib/applications';
import { NotificationBell } from '../../../components/notification-bell';

const TERMINAL = ['JOINED', 'REJECTED', 'WITHDRAWN'];
const PLACING = ['OFFER_RELEASED', 'OFFER_ACCEPTED', 'JOINED'];

// Stage → Badge tint. Anything not listed falls back to cream.
const STAGE_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  APPLIED: 'cream',
  VERIFIED: 'cream',
  SHORTLISTED: 'lavender',
  ROUND_1: 'lavender',
  ROUND_2: 'lavender',
  ROUND_3: 'lavender',
  HR: 'lavender',
  OFFER_RELEASED: 'mint',
  OFFER_ACCEPTED: 'mint',
  JOINED: 'mint',
};

const label = (s: string) => s.replace(/_/g, ' ');

interface NextInterview {
  when: Date;
  roundName: string;
  jobTitle: string;
  company: string;
  mode: string | null;
}

/** Earliest scheduled, still-pending interview across all applications. */
function findNextInterview(apps: Application[]): NextInterview | null {
  const now = Date.now();
  const upcoming: NextInterview[] = [];
  for (const a of apps) {
    for (const r of a.interviews) {
      if (!r.scheduledAt || r.result !== 'PENDING') continue;
      const when = new Date(r.scheduledAt);
      if (when.getTime() < now) continue;
      upcoming.push({
        when,
        roundName: r.roundName,
        jobTitle: a.job.title,
        company: a.job.company.name,
        mode: r.mode,
      });
    }
  }
  upcoming.sort((x, y) => x.when.getTime() - y.when.getTime());
  return upcoming[0] ?? null;
}

const fmtDateTime = (d: Date) =>
  d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function StudentHome() {
  const [student, setStudent] = useState<Student | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([getOwnStudent(), listMyApplications()]);
        setStudent(s);
        setApps(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const firstName = student?.user.fullName?.split(' ')[0] ?? 'there';
  const active = apps.filter((a) => !TERMINAL.includes(a.stage));
  const offers = apps.filter((a) => PLACING.includes(a.stage) || a.offerCtc != null);
  const nextInterview = findNextInterview(apps);
  const completion = student?.profileCompletion ?? 0;
  const showProfileNudge =
    !!student && (completion < 100 || student.verificationStatus !== 'VERIFIED');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-subtle">Welcome back</p>
          <h1 className="text-2xl font-semibold text-strong">Hi, {firstName}</h1>
        </div>
        <NotificationBell
          href="/me/notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card"
        />
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat value={apps.length} label="Applications" />
        <Stat value={active.length} label="In progress" />
        <Stat value={offers.length} label="Offers" />
      </div>

      {/* Profile / verification nudge */}
      {showProfileNudge && (
        <Link href="/me/profile" className="block">
          <Card className="space-y-3 p-5 transition hover:shadow-nav">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-strong">
                {student!.verificationStatus === 'VERIFIED'
                  ? 'Complete your profile'
                  : student!.verificationStatus === 'SUBMITTED'
                    ? 'Profile submitted — awaiting verification'
                    : student!.verificationStatus === 'REJECTED'
                      ? 'Profile needs changes'
                      : 'Get your profile verified'}
              </p>
              <span className="text-xs font-medium text-subtle">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-app">
              <div
                className="h-full rounded-pill bg-primary-400"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-subtle">
              {student!.verificationStatus === 'VERIFIED'
                ? 'A complete profile makes you eligible for more roles.'
                : 'Verified students unlock the job feed. Tap to review your details.'}
            </p>
          </Card>
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        <QuickLink href="/me/jobs" title="Jobs" sub="Browse & apply" />
        <QuickLink href="/me/profile" title="Profile" sub="Edit · verify" />
        <QuickLink href="/me/resume" title="Resume" sub="Build · share" />
        <QuickLink href="/me/training" title="Readiness" sub="Scores · training" />
        <QuickLink href="/me/applications" title="Applications" sub="Track status" />
        <QuickLink href="/me/notifications" title="Alerts" sub="Updates" />
      </div>

      {/* Next interview hero */}
      {nextInterview ? (
        <div className="rounded-card bg-gradient-primary p-5 text-white shadow-nav">
          <p className="text-xs/relaxed opacity-90">
            Next interview · {fmtDateTime(nextInterview.when)}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {nextInterview.jobTitle} — {nextInterview.roundName}
          </h2>
          <p className="mt-3 text-sm opacity-90">
            {nextInterview.company}
            {nextInterview.mode ? ` · ${nextInterview.mode}` : ''}
          </p>
        </div>
      ) : (
        <div className="rounded-card bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-strong">No interviews scheduled</p>
          <p className="mt-1 text-xs text-subtle">
            Keep applying — scheduled rounds will show up here.
          </p>
        </div>
      )}

      {/* Active applications */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-strong">Your applications</h3>
          {apps.length > 0 && (
            <Link href="/me/applications" className="text-sm text-primary-600">
              See all
            </Link>
          )}
        </div>

        {apps.length === 0 ? (
          <Card className="space-y-2 p-6 text-center">
            <p className="text-sm text-subtle">You haven't applied to any jobs yet.</p>
            <Link href="/me/jobs" className="text-sm font-medium text-primary-600">
              Browse jobs →
            </Link>
          </Card>
        ) : (
          (active.length > 0 ? active : apps).slice(0, 4).map((a) => (
            <Link key={a.id} href="/me/applications" className="block">
              <Card className="p-4 transition hover:shadow-nav">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-strong">{a.job.title}</p>
                    <p className="text-xs text-subtle">
                      {a.job.company.name} · applied{' '}
                      {new Date(a.appliedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <Badge tint={STAGE_TINT[a.stage] ?? 'cream'}>{label(a.stage)}</Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-2xl font-semibold text-strong">{value}</p>
      <p className="text-xs text-subtle">{label}</p>
    </Card>
  );
}

function QuickLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="rounded-card bg-white p-4 shadow-card transition hover:shadow-nav"
    >
      <p className="text-sm font-semibold text-strong">{title}</p>
      <p className="mt-1 text-xs text-subtle">{sub}</p>
    </Link>
  );
}
