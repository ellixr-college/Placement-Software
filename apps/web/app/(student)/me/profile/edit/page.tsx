'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { PROFILE_STEPS, computeProfileCompletion, isProfileFieldFilled } from '@ellixr/shared';
import { useSession } from '../../../../../lib/session';
import { getMyResume } from '../../../../../lib/resume';
import {
  getOwnStudent,
  updateOwnProfile,
  submitOwnProfile,
  type Student,
  type UpdateOwnProfileInput,
} from '../../../../../lib/students';

/** Minimum profile readiness needed before we send a student back to apply. */
function isReadyToApply(student: Student, resumeUploaded: boolean | null): boolean {
  return !!resumeUploaded && (student.profileCompletion ?? 0) >= 60;
}

/**
 * Student profile completion wizard. The compulsory fields from the college's
 * profile data sheet are grouped into 5 steps. Students can save progress at
 * any time and submit for verification once every required field is filled.
 */
export default function StudentProfilePage() {
  return (
    <Suspense fallback={<p className="text-subtle">Loading…</p>}>
      <StudentProfileEdit />
    </Suspense>
  );
}

function StudentProfileEdit() {
  const { signOut } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<UpdateOwnProfileInput>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState<boolean | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const s = await getOwnStudent();
        setStudent(s);
        const f = toForm(s);
        setForm(f);
        // Open the first incomplete step.
        const { steps } = computeProfileCompletion(f as Record<string, unknown>);
        const firstIncomplete = steps.findIndex((st) => st.percentage < 100);
        setStep(firstIncomplete === -1 ? 0 : firstIncomplete);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
    getMyResume()
      .then((r) => setResumeUploaded(!!r.fileUrl))
      .catch(() => setResumeUploaded(false));
  }, []);

  const completion = useMemo(
    () => computeProfileCompletion(form as Record<string, unknown>),
    [form],
  );

  const currentStep = PROFILE_STEPS[step]!;
  const isLastStep = step === PROFILE_STEPS.length - 1;

  function patch(p: Partial<UpdateOwnProfileInput>) {
    setForm((f) => ({ ...f, ...p }));
    Object.keys(p).forEach((k) => touched.add(k));
    setTouched(new Set(touched));
    setSaved(false);
  }

  function stepIsValid(idx = step) {
    const s = PROFILE_STEPS[idx];
    if (!s) return false;
    return s.fields
      .filter((f) => f.required)
      .every((f) => isProfileFieldFilled(form[f.key as keyof UpdateOwnProfileInput], f.type));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const s = await updateOwnProfile(clean(form));
      setStudent(s);
      setForm(toForm(s));
      setSaved(true);
      setTouched(new Set());
      if (next && isReadyToApply(s, resumeUploaded)) {
        router.push(next);
      }
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
      if (next && isReadyToApply(s, resumeUploaded)) {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!stepIsValid()) {
      setError('Please fill all required fields in this step before continuing.');
      setTouched(new Set(PROFILE_STEPS[step]!.fields.map((f) => f.key)));
      return;
    }
    setError(null);
    if (!isLastStep) setStep((x) => x + 1);
  }

  function goPrev() {
    setError(null);
    setStep((x) => Math.max(0, x - 1));
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!student) return <p className="text-danger">{error ?? 'Profile not found'}</p>;

  const locked = student.verificationStatus === 'SUBMITTED';
  const canSubmit =
    (student.verificationStatus === 'PENDING' || student.verificationStatus === 'REJECTED') &&
    completion.overall >= 100;

  return (
    <div className="space-y-5 pb-32">
      <header className="space-y-1">
        <Link href="/me/profile" className="text-sm text-primary-600">
          ← Profile
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-strong">Complete your profile</h1>
        <p className="text-sm text-subtle">
          {student.user.fullName} · {student.rollNumber}
        </p>
      </header>

      {next && (
        <div className="rounded-md bg-primary-50 px-4 py-3 text-sm text-primary-700">
          <span className="font-medium">You’re completing your profile to apply for a job.</span>{' '}
          Fill in the important details and upload your résumé, then you’ll be redirected back to
          the application.
        </div>
      )}

      {/* Overall progress -->
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-strong">Profile completion</p>
          <span className="text-sm font-semibold text-primary-600">{completion.overall}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-pill bg-app">
          <div
            className="h-full rounded-pill bg-gradient-primary transition-all"
            style={{ width: `${completion.overall}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium uppercase text-subtle">
          {PROFILE_STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`flex flex-col items-center gap-1 ${i === step ? 'text-primary-600' : ''}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  completion.steps[i]!.percentage >= 100
                    ? 'bg-success text-white'
                    : i === step
                      ? 'bg-primary-600 text-white'
                      : 'bg-app text-subtle'
                }`}
              >
                {completion.steps[i]!.percentage >= 100 ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Verification status */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-strong">Verification</p>
          <StatusBadge status={student.verificationStatus} />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-subtle">
            <span>Résumé upload</span>
            <span>
              {resumeUploaded === null ? '—' : resumeUploaded ? 'Uploaded ✓' : 'Not uploaded'}
            </span>
          </div>
          <Link
            href={
              next
                ? `/me/resume?next=${encodeURIComponent(`/me/profile/edit?next=${encodeURIComponent(next)}`)}`
                : '/me/resume'
            }
            className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline"
          >
            {resumeUploaded ? 'Manage your résumé →' : 'Upload your résumé PDF →'}
          </Link>
        </div>
        {student.verificationStatus === 'REJECTED' && student.rejectionReason && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            Officer feedback: {student.rejectionReason}
          </p>
        )}
      </Card>

      {/* Step form */}
      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-subtle">
              Step {step + 1} of {PROFILE_STEPS.length}
            </p>
            <h2 className="text-lg font-semibold text-strong">{currentStep.label}</h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              completion.steps[step]!.percentage >= 100
                ? 'bg-success/15 text-success'
                : 'bg-tint-cream text-tint-cream-fg'
            }`}
          >
            {completion.steps[step]!.completed}/{completion.steps[step]!.total} done
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currentStep.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={form[field.key as keyof UpdateOwnProfileInput]}
              onChange={(v) => patch({ [field.key]: v } as Partial<UpdateOwnProfileInput>)}
              showError={
                touched.has(field.key) &&
                field.required &&
                !isProfileFieldFilled(form[field.key as keyof UpdateOwnProfileInput], field.type)
              }
            />
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">Saved ✓</p>}
      {locked && (
        <p className="text-xs text-subtle">
          Your profile is awaiting review. You can still edit and re-save.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={goPrev} disabled={step === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSave} loading={saving}>
            {saving ? 'Saving…' : 'Save progress'}
          </Button>
          {!isLastStep ? (
            <Button onClick={goNext}>Next step</Button>
          ) : canSubmit ? (
            <Button onClick={onSubmit} loading={submitting}>
              {submitting ? 'Submitting…' : 'Submit for verification'}
            </Button>
          ) : (
            <Button disabled>Complete all steps to submit</Button>
          )}
        </div>
      </div>

      {next && isReadyToApply(student, resumeUploaded) && (
        <Button variant="outline" className="w-full" onClick={() => router.push(next)}>
          Continue to job application →
        </Button>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  showError,
}: {
  field: (typeof PROFILE_STEPS)[number]['fields'][number];
  value: unknown;
  onChange: (v: unknown) => void;
  showError?: boolean;
}) {
  const label = (
    <span className="text-xs font-medium text-subtle">
      {field.label}
      {field.required && <span className="text-danger"> *</span>}
    </span>
  );

  if (field.key === 'gender') {
    return (
      <label className="block space-y-1">
        {label}
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputCls(showError)}
        >
          <option value="">Select gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 rounded-md border border-border bg-white p-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-primary-600"
        />
        <span className="text-sm text-body">
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
        </span>
      </label>
    );
  }

  const type =
    field.type === 'number' || field.type === 'year'
      ? 'number'
      : field.key === 'dateOfBirth'
        ? 'date'
        : field.type === 'email'
          ? 'email'
          : field.type === 'phone'
            ? 'tel'
            : 'text';

  return (
    <label className="block space-y-1">
      {label}
      <input
        type={type}
        value={(value as string | number) ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (type === 'number') {
            onChange(v === '' ? undefined : Number(v));
          } else {
            onChange(v || undefined);
          }
        }}
        placeholder={field.placeholder}
        className={inputCls(showError)}
      />
    </label>
  );
}

function inputCls(error?: boolean) {
  return `h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-primary-400 ${
    error ? 'border-danger' : 'border-border'
  }`;
}

function toForm(s: Student): UpdateOwnProfileInput {
  const str = (v: string | null) => v ?? '';
  const num = (v: number | null) => (v == null ? undefined : v);
  const bool = (v: boolean | null) => (v == null ? undefined : v);
  return {
    fullName: s.user.fullName,
    phone: s.user.phone ?? '',
    enrollmentNumber: str(s.enrollmentNumber),
    course: s.course,
    branch: s.branch,
    graduationYear: s.graduationYear,
    cgpa: num(s.cgpa),
    activeBacklogs: s.activeBacklogs,
    totalBacklogs: s.totalBacklogs,
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
    gender: str(s.gender),
    personalEmail: str(s.personalEmail),
    linkedinUrl: str(s.linkedinUrl),
    tenthPercentage: num(s.tenthPercentage),
    twelfthPercentage: num(s.twelfthPercentage),
    ugPercentage: num(s.ugPercentage),
    semesterMarks: s.semesterMarks ?? [],
    nationality: str(s.nationality),
    panNumber: str(s.panNumber),
    currentAddress: str(s.currentAddress),
    permanentAddress: str(s.permanentAddress),
    city: str(s.city),
    state: str(s.state),
    pinCode: str(s.pinCode),
    fatherName: str(s.fatherName),
    fatherOccupation: str(s.fatherOccupation),
    fatherPhone: str(s.fatherPhone),
    department: str(s.department),
    specialization: str(s.specialization),
    admissionYear: num(s.admissionYear),
    currentSemester: num(s.currentSemester),
    hasArrearHistory: bool(s.hasArrearHistory),
    tenthBoard: str(s.tenthBoard),
    tenthSchool: str(s.tenthSchool),
    tenthPassingYear: num(s.tenthPassingYear),
    twelfthBoard: str(s.twelfthBoard),
    twelfthSchool: str(s.twelfthSchool),
    twelfthStream: str(s.twelfthStream),
    twelfthPassingYear: num(s.twelfthPassingYear),
    ugCollege: str(s.ugCollege),
    ugDegree: str(s.ugDegree),
    ugSpecialization: str(s.ugSpecialization),
    languagesKnown: str(s.languagesKnown),
    communicationSkillRating: num(s.communicationSkillRating),
    higherStudiesPlanned: bool(s.higherStudiesPlanned),
    entrepreneurshipInterest: bool(s.entrepreneurshipInterest),
  };
}

function clean(form: UpdateOwnProfileInput): UpdateOwnProfileInput {
  const out: UpdateOwnProfileInput = {};
  const str = (k: keyof UpdateOwnProfileInput) => {
    const v = form[k];
    if (typeof v === 'string' && v.trim()) (out[k] as unknown) = v.trim();
  };
  const num = (k: keyof UpdateOwnProfileInput) => {
    const v = form[k];
    if (v !== undefined && v !== '' && v !== null) (out[k] as unknown) = Number(v);
  };
  const bool = (k: keyof UpdateOwnProfileInput) => {
    const v = form[k];
    if (typeof v === 'boolean') (out[k] as unknown) = v;
  };

  str('fullName');
  str('phone');
  str('enrollmentNumber');
  str('course');
  str('branch');
  if (form.graduationYear != null) out.graduationYear = form.graduationYear;
  num('cgpa');
  if (form.activeBacklogs != null) out.activeBacklogs = form.activeBacklogs;
  if (form.totalBacklogs != null) out.totalBacklogs = form.totalBacklogs;
  str('dateOfBirth');
  str('gender');
  str('personalEmail');
  str('linkedinUrl');
  num('tenthPercentage');
  num('twelfthPercentage');
  num('ugPercentage');
  if (form.semesterMarks) {
    out.semesterMarks = form.semesterMarks.filter((m) => m.label.trim() && m.score.trim());
  }

  str('nationality');
  str('panNumber');
  str('currentAddress');
  str('permanentAddress');
  str('city');
  str('state');
  str('pinCode');
  str('fatherName');
  str('fatherOccupation');
  str('fatherPhone');
  str('department');
  str('specialization');
  num('admissionYear');
  num('currentSemester');
  bool('hasArrearHistory');
  str('tenthBoard');
  str('tenthSchool');
  num('tenthPassingYear');
  str('twelfthBoard');
  str('twelfthSchool');
  str('twelfthStream');
  num('twelfthPassingYear');
  str('ugCollege');
  str('ugDegree');
  str('ugSpecialization');
  str('languagesKnown');
  num('communicationSkillRating');
  bool('higherStudiesPlanned');
  bool('entrepreneurshipInterest');

  return out;
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
