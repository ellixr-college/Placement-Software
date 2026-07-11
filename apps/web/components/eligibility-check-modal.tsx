'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import { type Job } from '../lib/jobs';
import { getOwnStudent, updateOwnProfile, type Student } from '../lib/students';
import { uploadMyResume } from '../lib/resume';

interface Props {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onEligible: () => void;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'number' | 'select' | 'file';
  options?: string[];
  required: boolean;
}

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export function EligibilityCheckModal({ job, open, onClose, onEligible }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setResumeFile(null);
    setValues({});
    getOwnStudent()
      .then((s) => {
        setStudent(s);
        setValues({
          gender: s.gender ?? '',
          cgpa: s.cgpa != null ? String(s.cgpa) : '',
          tenthPercentage: s.tenthPercentage != null ? String(s.tenthPercentage) : '',
          twelfthPercentage: s.twelfthPercentage != null ? String(s.twelfthPercentage) : '',
          ugPercentage: s.ugPercentage != null ? String(s.ugPercentage) : '',
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !job) return null;

  const fields: FieldDef[] = [];

  if (!student?.resumeComplete) {
    fields.push({ key: 'resume', label: 'Resume PDF', type: 'file', required: true });
  }

  if (job.eligibleGenders?.length && !student?.gender) {
    fields.push({
      key: 'gender',
      label: 'Gender',
      type: 'select',
      options: GENDERS,
      required: true,
    });
  }

  if (job.minCgpa != null && student?.cgpa == null) {
    fields.push({
      key: 'cgpa',
      label: 'Current percentage / CGPA',
      type: 'number',
      required: true,
    });
  }

  if (job.minTenthPercentage != null && student?.tenthPercentage == null) {
    fields.push({
      key: 'tenthPercentage',
      label: 'Class X percentage',
      type: 'number',
      required: true,
    });
  }

  if (job.minTwelfthPercentage != null && student?.twelfthPercentage == null) {
    fields.push({
      key: 'twelfthPercentage',
      label: 'Class XII / Diploma percentage',
      type: 'number',
      required: true,
    });
  }

  if (job.minUgPercentage != null && student?.ugPercentage == null) {
    fields.push({ key: 'ugPercentage', label: 'UG percentage', type: 'number', required: true });
  }

  const hardBlockers = (job.eligibilityReasons ?? []).filter((r) => {
    if (r === 'Resume not uploaded') return false;
    if (r === 'Gender not set') return false;
    if (r === 'Profile not verified') return false;
    if (
      r.startsWith('Percentage below') ||
      r.startsWith('10th below') ||
      r.startsWith('12th below') ||
      r.startsWith('UG below')
    )
      return false;
    return true;
  });

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!student) return;
    setSaving(true);
    setError(null);
    try {
      if (resumeFile) {
        await uploadMyResume(resumeFile);
      }

      const update: Record<string, string | number> = {};
      if (fields.some((f) => f.key === 'gender') && values.gender) update.gender = values.gender;
      if (fields.some((f) => f.key === 'cgpa') && values.cgpa) update.cgpa = Number(values.cgpa);
      if (fields.some((f) => f.key === 'tenthPercentage') && values.tenthPercentage)
        update.tenthPercentage = Number(values.tenthPercentage);
      if (fields.some((f) => f.key === 'twelfthPercentage') && values.twelfthPercentage)
        update.twelfthPercentage = Number(values.twelfthPercentage);
      if (fields.some((f) => f.key === 'ugPercentage') && values.ugPercentage)
        update.ugPercentage = Number(values.ugPercentage);

      if (Object.keys(update).length > 0) {
        await updateOwnProfile(update);
      }

      onEligible();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete application');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="animate-sheet max-h-[85vh] w-full max-w-md overflow-y-auto p-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-strong">Complete eligibility</h2>
            <p className="text-sm text-subtle">
              {job.title} needs a few details before you can apply.
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {loading ? (
            <p className="text-subtle">Loading profile…</p>
          ) : (
            <>
              {fields.length === 0 && hardBlockers.length === 0 && (
                <p className="text-sm text-subtle">You are eligible. Tap apply to continue.</p>
              )}

              {fields.map((f) => (
                <label key={f.key} className="block space-y-1.5">
                  <span className="text-sm font-medium text-body">{f.label}</span>
                  {f.key === 'resume' ? (
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={values[f.key] ?? ''}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-body outline-none focus:border-primary-400"
                    >
                      <option value="">Select {f.label.toLowerCase()}</option>
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={values[f.key] ?? ''}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      placeholder={f.label}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-body outline-none focus:border-primary-400"
                    />
                  )}
                </label>
              ))}

              {hardBlockers.length > 0 && (
                <div className="rounded-md bg-danger/10 p-3 text-sm text-danger">
                  <p className="font-medium">You don&apos;t meet some eligibility criteria:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {hardBlockers.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={submit}
                  loading={saving}
                  disabled={saving || hardBlockers.length > 0}
                >
                  {saving ? 'Saving…' : 'Continue to apply'}
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
