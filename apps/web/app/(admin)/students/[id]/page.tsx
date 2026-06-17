'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { EmployabilityCard } from '../../../../components/employability-card';
import {
  getStudent,
  setStudentActive,
  verifyStudent,
  type Student,
} from '../../../../lib/students';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
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
        <Button variant={student.isActive ? 'outline' : 'primary'} onClick={toggleActive} disabled={busy}>
          {busy ? 'Saving…' : student.isActive ? 'Disable login' : 'Enable login'}
        </Button>
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

      <Card className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <Detail label="Course" value={student.course} />
        <Detail label="Branch" value={student.branch} />
        <Detail label="Graduation year" value={String(student.graduationYear)} />
        <Detail label="CGPA" value={student.cgpa != null ? String(student.cgpa) : '—'} />
        <Detail label="Active backlogs" value={String(student.activeBacklogs)} />
        <Detail label="Total backlogs" value={String(student.totalBacklogs)} />
        <Detail label="Enrollment no." value={student.enrollmentNumber ?? '—'} />
        <Detail label="Phone" value={student.user.phone ?? '—'} />
        <Detail label="Personal email" value={student.personalEmail ?? '—'} />
        <Detail
          label="Date of birth"
          value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}
        />
        <Detail label="Gender" value={student.gender ?? '—'} />
        <Detail
          label="10th %"
          value={student.tenthPercentage != null ? String(student.tenthPercentage) : '—'}
        />
        <Detail
          label="12th %"
          value={student.twelfthPercentage != null ? String(student.twelfthPercentage) : '—'}
        />
        <Detail
          label="Last login"
          value={
            student.user.lastLoginAt
              ? new Date(student.user.lastLoginAt).toLocaleString()
              : 'Never'
          }
        />
        <Detail label="Profile complete" value={`${student.profileCompletion}%`} />
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-subtle">{label}</p>
      <p className="text-sm font-medium text-strong">{value}</p>
    </div>
  );
}
