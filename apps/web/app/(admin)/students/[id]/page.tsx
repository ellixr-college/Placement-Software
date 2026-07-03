'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card } from '@ellixr/ui';
import { EmployabilityCard } from '../../../../components/employability-card';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  deleteStudent,
  getStudent,
  setStudentActive,
  updateStudent,
  verifyStudent,
  type Student,
} from '../../../../lib/students';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStudent(await getStudent(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function toggleActive() {
    if (!student) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setStudentActive(student.id, !student.isActive);
      setStudent({ ...student, isActive: res.isActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!student) return;
    const ok = await confirm({
      title: `Delete ${student.user.fullName}?`,
      message: 'This permanently removes the student and their login. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      acknowledgement: 'I understand this is permanent.',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStudent(student.id);
      router.push('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  async function runVerify(action: 'verify' | 'reject', reason?: string) {
    if (!student) return;
    setVerifying(true);
    setError(null);
    try {
      const updated = await verifyStudent(student.id, action, reason);
      setStudent(updated);
      setShowReject(false);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!student) return <p className="text-danger">{error ?? 'Student not found'}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/students" className="text-sm text-primary-600 hover:underline">
          ← Students
        </Link>
        <div className="flex items-center gap-2">
          <Button variant={student.isActive ? 'outline' : 'primary'} onClick={toggleActive} disabled={busy}>
            {busy ? 'Saving…' : student.isActive ? 'Disable login' : 'Enable login'}
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">{student.user.fullName}</h1>
          <p className="text-sm text-subtle">
            {student.user.email} · {student.rollNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tint="primary">{student.status}</Badge>
          {student.isActive ? (
            <span className="text-xs text-success">Login active</span>
          ) : (
            <span className="text-xs text-subtle">Login disabled</span>
          )}
        </div>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-subtle">Verification</p>
            <p className="mt-1 flex items-center gap-2">
              <VerificationBadge status={student.verificationStatus} />
              {student.verifiedAt && (
                <span className="text-xs text-subtle">
                  on {new Date(student.verifiedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          {!showReject && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => runVerify('verify')}
                disabled={verifying || student.verificationStatus === 'VERIFIED'}
              >
                {verifying ? 'Saving…' : 'Verify'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReject(true)}
                disabled={verifying || student.verificationStatus === 'REJECTED'}
              >
                Reject
              </Button>
            </div>
          )}
        </div>

        {student.verificationStatus === 'REJECTED' && student.rejectionReason && (
          <p className="rounded-card bg-danger/10 px-3 py-2 text-sm text-danger">
            Rejected: {student.rejectionReason}
          </p>
        )}

        {showReject && (
          <div className="space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (shown to the student)"
              rows={2}
              className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => runVerify('reject', rejectReason.trim() || undefined)}
                disabled={verifying}
              >
                {verifying ? 'Saving…' : 'Confirm rejection'}
              </Button>
              <Button variant="ghost" onClick={() => setShowReject(false)} disabled={verifying}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-strong">Details</h2>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <EditStudentForm
            student={student}
            onCancel={() => setEditing(false)}
            onSaved={(s) => {
              setStudent(s);
              setEditing(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Name" value={student.user.fullName} />
            <Detail label="Reg no." value={student.rollNumber} />
            <Detail label="Course" value={student.course || '—'} />
            <Detail label="Branch" value={student.branch || '—'} />
            <Detail label="Passout year" value={String(student.graduationYear)} />
            <Detail label="Current year" value={student.currentYear ? `Year ${student.currentYear}` : '—'} />
            <Detail label="Percentage" value={student.cgpa != null ? `${student.cgpa}%` : '—'} />
            <Detail label="Active backlogs" value={String(student.activeBacklogs)} />
            <Detail label="Total backlogs" value={String(student.totalBacklogs)} />
            <Detail label="Enrollment no." value={student.enrollmentNumber ?? '—'} />
            <Detail label="Phone" value={student.user.phone ?? '—'} />
            <Detail label="Personal email" value={student.personalEmail ?? '—'} />
            <Detail label="LinkedIn" value={student.linkedinUrl ?? '—'} />
            <Detail
              label="Date of birth"
              value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}
            />
            <Detail label="Gender" value={student.gender ?? '—'} />
            <Detail label="10th %" value={student.tenthPercentage != null ? String(student.tenthPercentage) : '—'} />
            <Detail label="12th %" value={student.twelfthPercentage != null ? String(student.twelfthPercentage) : '—'} />
            <Detail label="UG %" value={student.ugPercentage != null ? String(student.ugPercentage) : '—'} />
            <Detail
              label="Last login"
              value={student.user.lastLoginAt ? new Date(student.user.lastLoginAt).toLocaleString() : 'Never'}
            />
            <Detail label="Profile complete" value={`${student.profileCompletion}%`} />
          </div>
        )}
      </Card>

      <EmployabilityCard studentId={student.id} />
    </div>
  );
}

const VERIFICATION_CLASS: Record<string, string> = {
  PENDING: 'bg-tint-cream text-tint-cream-fg',
  SUBMITTED: 'bg-primary-50 text-primary-700',
  VERIFIED: 'bg-success/15 text-success',
  REJECTED: 'bg-danger/15 text-danger',
};

function VerificationBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        VERIFICATION_CLASS[status] ?? 'bg-primary-50 text-primary-700'
      }`}
    >
      {status}
    </span>
  );
}

const editInputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function EditStudentForm({
  student,
  onCancel,
  onSaved,
}: {
  student: Student;
  onCancel: () => void;
  onSaved: (s: Student) => void;
}) {
  const [form, setForm] = useState({
    fullName: student.user.fullName,
    phone: student.user.phone ?? '',
    rollNumber: student.rollNumber,
    course: student.course,
    branch: student.branch,
    graduationYear: String(student.graduationYear),
    currentYear: student.currentYear != null ? String(student.currentYear) : '',
    cgpa: student.cgpa != null ? String(student.cgpa) : '',
    ugPercentage: student.ugPercentage != null ? String(student.ugPercentage) : '',
    enrollmentNumber: student.enrollmentNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStudent(student.id, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        rollNumber: form.rollNumber.trim(),
        course: form.course.trim(),
        branch: form.branch.trim(),
        graduationYear: Number(form.graduationYear),
        currentYear: form.currentYear === '' ? undefined : Number(form.currentYear),
        cgpa: form.cgpa === '' ? undefined : Number(form.cgpa),
        ugPercentage: form.ugPercentage === '' ? undefined : Number(form.ugPercentage),
        enrollmentNumber: form.enrollmentNumber.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EditField label="Name" value={form.fullName} onChange={set('fullName')} />
        <EditField label="Reg no." value={form.rollNumber} onChange={set('rollNumber')} />
        <EditField label="Course" value={form.course} onChange={set('course')} />
        <EditField label="Branch" value={form.branch} onChange={set('branch')} />
        <EditField label="Passout year" type="number" value={form.graduationYear} onChange={set('graduationYear')} />
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">Current year of study</span>
          <select
            className={editInputCls}
            value={form.currentYear}
            onChange={(e) => setForm((f) => ({ ...f, currentYear: e.target.value }))}
          >
            <option value="">Not tracked</option>
            <option value="1">1st year</option>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
          </select>
        </label>
        <EditField label="Phone" value={form.phone} onChange={set('phone')} />
        <EditField label="Percentage (%)" type="number" value={form.cgpa} onChange={set('cgpa')} />
        <EditField label="UG %" type="number" value={form.ugPercentage} onChange={set('ugPercentage')} />
        <EditField label="Enrollment no." value={form.enrollmentNumber} onChange={set('enrollmentNumber')} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={onChange}
        className={editInputCls}
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-subtle">{label}</p>
      <p className="text-sm font-medium text-strong">{value}</p>
    </div>
  );
}
