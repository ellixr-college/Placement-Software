'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@ellixr/ui';
import { getOwnStudent, type Student } from '../../../../lib/students';
import { useSession } from '../../../../lib/session';

/**
 * Student "Profile" hub — an actions menu listing everything the student can do
 * (edit details, resume, jobs, applications, internships, training, alerts,
 * password, sign out). The profile editor itself lives at /me/profile/edit.
 */
export default function ProfileMenuPage() {
  const { signOut } = useSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnStudent()
      .then(setStudent)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const verified = student?.verificationStatus === 'VERIFIED';
  const completion = student?.profileCompletion ?? 0;
  const profileDone = verified && completion >= 100;

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-semibold text-strong">Profile</h1>

      {/* Identity card */}
      <Card className="flex items-center gap-4 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-semibold text-white">
          {initial(student?.user.fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-strong">
            {loading ? 'Loading…' : (student?.user.fullName ?? 'Student')}
          </p>
          {student && (
            <p className="truncate text-xs text-subtle">
              {student.rollNumber} · {student.course} · {student.graduationYear}
            </p>
          )}
          {student && (
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                verified ? 'bg-success/15 text-success' : 'bg-tint-cream text-tint-cream-fg'
              }`}
            >
              {verified ? 'Verified' : verLabel(student.verificationStatus)}
            </span>
          )}
        </div>
      </Card>

      <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
        Actions on your profile
      </p>

      {/* Highlighted: complete/verify profile */}
      <Link
        href="/me/profile/edit"
        className={`flex items-center gap-4 rounded-card border p-4 transition ${
          profileDone
            ? 'border-border bg-white hover:shadow-card'
            : 'border-primary-200 bg-primary-50/60 hover:shadow-card'
        }`}
      >
        <IconBox highlight={!profileDone}>
          <UserIcon />
        </IconBox>
        <div className="flex-1">
          <p className="text-sm font-semibold text-strong">
            {profileDone ? 'Personal details' : 'Complete your profile'}
          </p>
          <p className="text-xs text-subtle">
            {profileDone
              ? 'Edit your academic & personal info'
              : `${completion}% done · unlock more roles`}
          </p>
        </div>
        <Arrow />
      </Link>

      {/* The rest of the actions */}
      <Card className="divide-y divide-border p-0">
        <Row href="/me/resume" title="Resume" sub="Build & share your resume" icon={<DocIcon />} />
        <Row href="/me/jobs" title="Jobs" sub="Browse & apply" icon={<BriefcaseIcon />} />
        <Row
          href="/me/applications"
          title="My applications"
          sub="Track your status"
          icon={<ListIcon />}
        />
        <Row
          href="/me/internships"
          title="Internships"
          sub="Add internships you found"
          icon={<StarIcon />}
        />
        <Row
          href="/me/notifications"
          title="Notifications"
          sub="Alerts on your account"
          icon={<BellIcon />}
        />
        <Row
          href="/me/change-password"
          title="Change password"
          sub="Update your login password"
          icon={<LockIcon />}
        />
      </Card>

      <button
        onClick={signOut}
        className="flex w-full items-center gap-4 rounded-card border border-border bg-white p-4 text-left transition hover:shadow-card"
      >
        <IconBox>
          <LogoutIcon />
        </IconBox>
        <div className="flex-1">
          <p className="text-sm font-semibold text-danger">Sign out</p>
          <p className="text-xs text-subtle">Log out of this device</p>
        </div>
      </button>
    </div>
  );
}

function Row({
  href,
  title,
  sub,
  icon,
}: {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-4 transition hover:bg-app/50">
      <IconBox>{icon}</IconBox>
      <div className="flex-1">
        <p className="text-sm font-semibold text-strong">{title}</p>
        <p className="text-xs text-subtle">{sub}</p>
      </div>
      <Arrow />
    </Link>
  );
}

function IconBox({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
        highlight
          ? 'border-primary-300 bg-white text-primary-600'
          : 'border-border bg-white text-strong'
      }`}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return <span className="shrink-0 text-lg text-subtle">→</span>;
}

function initial(name?: string): string {
  return (name?.trim()?.[0] ?? 'S').toUpperCase();
}
function verLabel(status: string): string {
  if (status === 'SUBMITTED') return 'Under review';
  if (status === 'REJECTED') return 'Needs changes';
  return 'Not verified';
}

// ── icons ──
const sv = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className: 'h-5 w-5',
} as const;
function UserIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...sv}>
      <path d="M6 2h8l4 4v16H6z" strokeLinejoin="round" />
      <path d="M14 2v4h4M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg {...sv}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg {...sv}>
      <path
        d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...sv}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...sv}>
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21a2 2 0 0 0 4 0"
        strokeLinecap="round"
      />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg {...sv}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg {...sv}>
      <path d="M15 12H3m0 0 4-4m-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
