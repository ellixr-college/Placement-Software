'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import {
  getOwnStudent,
  updateOwnProfile,
  submitOwnProfile,
  type Student,
  type UpdateOwnProfileInput,
} from '../../../../lib/students';

/**
 * Student self-profile editor (mobile). Students edit their own academic fields
 * and submit the profile for placement-officer verification. rollNumber is
 * read-only — it is the officer-assigned identity.
 */
export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<UpdateOwnProfileInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getOwnStudent();
        setStudent(s);
        setForm(toForm(s));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function patch(p: Partial<UpdateOwnProfileInput>) {
    setForm((f) => ({ ...f, ...p }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const s = await updateOwnProfile(clean(form));
      setStudent(s);
      setForm(toForm(s));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const s = await submitOwnProfile();
      setStudent(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!student) return <p className="text-danger">{error ?? 'Profile not found'}</p>;

  const locked = student.verificationStatus === 'SUBMITTED';
  const canSubmit =
    student.verificationStatus === 'PENDING' || student.verificationStatus === 'REJECTED';

  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-strong">My profile</h1>
        <p className="text-sm text-subtle">
          {student.user.fullName} · {student.rollNumber}
        </p>
      </header>

      {/* Verification status */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-strong">Verification</p>
          <StatusBadge status={student.verificationStatus} />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-subtle">
            <span>Profile completion</span>
            <span>{student.profileCompletion}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-gradient-primary"
              style={{ width: `${student.profileCompletion}%` }}
            />
          </div>
        </div>

        {student.verificationStatus === 'REJECTED' && student.rejectionReason && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            Officer feedback: {student.rejectionReason}
          </p>
        )}
        {student.verificationStatus === 'SUBMITTED' && (
          <p className="text-xs text-subtle">
            Submitted for review — your officer will verify it shortly.
          </p>
        )}
        {student.verificationStatus === 'VERIFIED' && (
          <p className="text-xs text-success">
            Verified ✓ — editing your details will send it back for re-verification.
          </p>
        )}

        {canSubmit && (
          <Button className="w-full" variant="outline" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </Button>
        )}
      </Card>

      {/* Personal */}
      <Section title="Personal">
        <Text label="Full name" value={form.fullName ?? ''} onChange={(v) => patch({ fullName: v })} />
        <Text label="Phone" value={form.phone ?? ''} onChange={(v) => patch({ phone: v })} />
        <Text
          label="Personal email"
          type="email"
          value={form.personalEmail ?? ''}
          onChange={(v) => patch({ personalEmail: v })}
          placeholder="you@gmail.com"
        />
        <div className="grid grid-cols-2 gap-2">
          <Text
            label="Date of birth"
            type="date"
            value={form.dateOfBirth ?? ''}
            onChange={(v) => patch({ dateOfBirth: v })}
          />
          <Select
            label="Gender"
            value={form.gender ?? ''}
            onChange={(v) => patch({ gender: v })}
            options={GENDERS}
          />
        </div>
      </Section>

      {/* Academic */}
      <Section title="Academic">
        <Text label="Course" value={form.course ?? ''} onChange={(v) => patch({ course: v })} placeholder="B.Tech" />
        <Text label="Branch" value={form.branch ?? ''} onChange={(v) => patch({ branch: v })} placeholder="Computer Science" />
        <Text
          label="Enrollment number"
          value={form.enrollmentNumber ?? ''}
          onChange={(v) => patch({ enrollmentNumber: v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Text
            label="Graduation year"
            type="number"
            value={numStr(form.graduationYear)}
            onChange={(v) => patch({ graduationYear: toNum(v) })}
          />
          <Text
            label="CGPA"
            type="number"
            value={numStr(form.cgpa)}
            onChange={(v) => patch({ cgpa: toNum(v) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Text
            label="Active backlogs"
            type="number"
            value={numStr(form.activeBacklogs)}
            onChange={(v) => patch({ activeBacklogs: toNum(v) })}
          />
          <Text
            label="Total backlogs"
            type="number"
            value={numStr(form.totalBacklogs)}
            onChange={(v) => patch({ totalBacklogs: toNum(v) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Text
            label="10th %"
            type="number"
            value={numStr(form.tenthPercentage)}
            onChange={(v) => patch({ tenthPercentage: toNum(v) })}
          />
          <Text
            label="12th %"
            type="number"
            value={numStr(form.twelfthPercentage)}
            onChange={(v) => patch({ twelfthPercentage: toNum(v) })}
          />
        </div>
      </Section>

      {/* Semester marks */}
      <Section title="Semester marks">
        <p className="text-xs text-subtle">
          Add your SGPA/percentage per semester. These show on your profile and resume.
        </p>
        <SemesterEditor
          rows={form.semesterMarks ?? []}
          onChange={(rows) => patch({ semesterMarks: rows })}
        />
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      {locked && (
        <p className="text-xs text-subtle">
          Your profile is awaiting review. You can still edit and re-save.
        </p>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded-pill bg-white/95 p-2 shadow-nav backdrop-blur">
        <Button className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        {saved && <span className="pr-2 text-sm text-success">Saved ✓</span>}
      </div>
    </div>
  );
}

// ── helpers ──
function toForm(s: Student): UpdateOwnProfileInput {
  return {
    fullName: s.user.fullName,
    phone: s.user.phone ?? '',
    enrollmentNumber: s.enrollmentNumber ?? '',
    course: s.course,
    branch: s.branch,
    graduationYear: s.graduationYear,
    cgpa: s.cgpa ?? undefined,
    activeBacklogs: s.activeBacklogs,
    totalBacklogs: s.totalBacklogs,
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
    gender: s.gender ?? '',
    personalEmail: s.personalEmail ?? '',
    tenthPercentage: s.tenthPercentage ?? undefined,
    twelfthPercentage: s.twelfthPercentage ?? undefined,
    semesterMarks: s.semesterMarks ?? [],
  };
}

// Only send fields with a meaningful value; strip empty strings so optional
// fields aren't rejected by the API's string validators.
function clean(form: UpdateOwnProfileInput): UpdateOwnProfileInput {
  const out: UpdateOwnProfileInput = {};
  if (form.fullName?.trim()) out.fullName = form.fullName.trim();
  if (form.phone?.trim()) out.phone = form.phone.trim();
  if (form.enrollmentNumber?.trim()) out.enrollmentNumber = form.enrollmentNumber.trim();
  if (form.course?.trim()) out.course = form.course.trim();
  if (form.branch?.trim()) out.branch = form.branch.trim();
  if (form.graduationYear != null) out.graduationYear = form.graduationYear;
  if (form.cgpa != null) out.cgpa = form.cgpa;
  if (form.activeBacklogs != null) out.activeBacklogs = form.activeBacklogs;
  if (form.totalBacklogs != null) out.totalBacklogs = form.totalBacklogs;
  if (form.dateOfBirth?.trim()) out.dateOfBirth = form.dateOfBirth.trim();
  if (form.gender?.trim()) out.gender = form.gender.trim();
  if (form.personalEmail?.trim()) out.personalEmail = form.personalEmail.trim();
  if (form.tenthPercentage != null) out.tenthPercentage = form.tenthPercentage;
  if (form.twelfthPercentage != null) out.twelfthPercentage = form.twelfthPercentage;
  if (form.semesterMarks) {
    // Keep only rows with both a label and a score.
    const rows = form.semesterMarks.filter((m) => m.label.trim() && m.score.trim());
    out.semesterMarks = rows;
  }
  return out;
}

function numStr(n: number | undefined): string {
  return n == null ? '' : String(n);
}
function toNum(v: string): number | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-tint-cream text-tint-cream-fg',
  SUBMITTED: 'bg-primary-50 text-primary-700',
  VERIFIED: 'bg-success/15 text-success',
  REJECTED: 'bg-danger/15 text-danger',
};
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        STATUS_CLASS[status] ?? 'bg-primary-50 text-primary-700'
      }`}
    >
      {status}
    </span>
  );
}

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-subtle">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0) + o.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

function SemesterEditor({
  rows,
  onChange,
}: {
  rows: { label: string; score: string }[];
  onChange: (rows: { label: string; score: string }[]) => void;
}) {
  function update(i: number, patch: Partial<{ label: string; score: string }>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([...rows, { label: `Semester ${rows.length + 1}`, score: '' }]);
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-subtle">Label</label>
            <input
              value={r.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Semester 1"
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
            />
          </div>
          <div className="w-24 space-y-1">
            <label className="text-xs font-medium text-subtle">Score</label>
            <input
              value={r.score}
              onChange={(e) => update(i, { score: e.target.value })}
              placeholder="8.4"
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mb-2 text-xs text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        Add semester
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">{title}</p>
      {children}
    </Card>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-subtle">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
      />
    </div>
  );
}
