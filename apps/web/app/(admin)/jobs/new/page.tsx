'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { listCompanies, type Company } from '../../../../lib/companies';
import { listMyCourses, type CollegeCourse } from '../../../../lib/courses';
import { createJob } from '../../../../lib/jobs';

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

export default function NewJobPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [form, setForm] = useState({
    title: '',
    companyId: '',
    jobType: 'FULL_TIME',
    workMode: '',
    location: '',
    experienceMin: '',
    experienceMax: '',
    description: '',
    ctcMin: '',
    ctcMax: '',
    graduationYears: '',
    minCgpa: '',
    maxActiveBacklogs: '',
    maxTotalBacklogs: '',
    applicationDeadline: '',
  });
  // Eligibility courses/branches — chip selections (catalog) + free-text fallback.
  const [pickedCourses, setPickedCourses] = useState<string[]>([]);
  const [pickedBranches, setPickedBranches] = useState<string[]>([]);
  const [coursesText, setCoursesText] = useState('');
  const [branchesText, setBranchesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCompanies().then((c) => setCompanies(c.filter((x) => x.isActive))).catch(() => {});
    listMyCourses().then(setCourses).catch(() => {});
  }, []);

  const hasCatalog = courses.length > 0;

  // Branches available = union of the selected courses' branches.
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    for (const name of pickedCourses) {
      const c = courses.find((x) => x.name === name);
      c?.branches.forEach((b) => set.add(b));
    }
    return [...set];
  }, [pickedCourses, courses]);

  function toggleCourse(name: string) {
    setPickedCourses((cs) => {
      const next = cs.includes(name) ? cs.filter((x) => x !== name) : [...cs, name];
      // Prune branches no longer offered by any selected course.
      const allowed = new Set(
        next.flatMap((n) => courses.find((x) => x.name === n)?.branches ?? []),
      );
      setPickedBranches((bs) => bs.filter((b) => allowed.has(b)));
      return next;
    });
  }

  const toggleBranch = (b: string) =>
    setPickedBranches((bs) => (bs.includes(b) ? bs.filter((x) => x !== b) : [...bs, b]));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const numList = (v: string) => splitList(v).map(Number).filter((n) => !Number.isNaN(n));
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const eligibleCourses = hasCatalog ? pickedCourses : splitList(coursesText);
  const eligibleBranches = hasCatalog ? pickedBranches : splitList(branchesText);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const job = await createJob({
        title: form.title,
        companyId: form.companyId,
        jobType: form.jobType,
        workMode: form.workMode || undefined,
        location: form.location || undefined,
        experienceMin: num(form.experienceMin),
        experienceMax: num(form.experienceMax),
        description: form.description || undefined,
        ctcMin: num(form.ctcMin),
        ctcMax: num(form.ctcMax),
        eligibleCourses,
        eligibleBranches,
        graduationYears: numList(form.graduationYears),
        minCgpa: num(form.minCgpa),
        maxActiveBacklogs: num(form.maxActiveBacklogs),
        maxTotalBacklogs: num(form.maxTotalBacklogs),
        applicationDeadline: form.applicationDeadline
          ? new Date(form.applicationDeadline).toISOString()
          : undefined,
      });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create job');
      setSaving(false);
    }
  }

  const valid =
    form.title.trim() && form.companyId && eligibleCourses.length && numList(form.graduationYears).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/jobs" className="text-sm text-primary-600 hover:underline">← Jobs</Link>
      <h1 className="text-2xl font-semibold text-strong">Post a job</h1>
      <p className="text-sm text-subtle">Created as a draft. Publish it to notify eligible students.</p>

      <Card className="space-y-4 p-5">
        <Field label="Title *"><input className={inputCls} value={form.title} onChange={set('title')} /></Field>
        <Field label="Company *">
          <select className={inputCls} value={form.companyId} onChange={set('companyId')}>
            <option value="">Select a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job type">
            <select className={inputCls} value={form.jobType} onChange={set('jobType')}>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Work mode">
            <select className={inputCls} value={form.workMode} onChange={set('workMode')}>
              <option value="">Not specified</option>
              {WORK_MODES.map((m) => <option key={m} value={m}>{m === 'ONSITE' ? 'Work from office' : m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Location"><input className={inputCls} value={form.location} onChange={set('location')} placeholder="Bangalore" /></Field>
          <Field label="Min experience (yrs)"><input className={inputCls} type="number" value={form.experienceMin} onChange={set('experienceMin')} placeholder="0" /></Field>
          <Field label="Max experience (yrs)"><input className={inputCls} type="number" value={form.experienceMax} onChange={set('experienceMax')} placeholder="3" /></Field>
        </div>
        <Field label="Description"><textarea className={areaCls} rows={3} value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTC min (₹/yr)"><input className={inputCls} type="number" value={form.ctcMin} onChange={set('ctcMin')} /></Field>
          <Field label="CTC max (₹/yr)"><input className={inputCls} type="number" value={form.ctcMax} onChange={set('ctcMax')} /></Field>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-1 text-sm font-semibold text-strong">Who can apply</p>
          <p className="mb-3 text-xs text-subtle">Only students in the selected courses/branches see and can apply to this job.</p>
          <div className="space-y-3">
            {hasCatalog ? (
              <>
                <Field label="Eligible courses *">
                  <ChipPicker options={courses.map((c) => c.name)} selected={pickedCourses} onToggle={toggleCourse} />
                </Field>
                {availableBranches.length > 0 && (
                  <Field label="Eligible branches (leave empty = all branches of the selected courses)">
                    <ChipPicker options={availableBranches} selected={pickedBranches} onToggle={toggleBranch} />
                  </Field>
                )}
              </>
            ) : (
              <>
                <Field label="Eligible courses * (comma-separated)"><input className={inputCls} value={coursesText} onChange={(e) => setCoursesText(e.target.value)} placeholder="B.Tech, M.Tech" /></Field>
                <Field label="Eligible branches (comma-separated, optional)"><input className={inputCls} value={branchesText} onChange={(e) => setBranchesText(e.target.value)} placeholder="CSE, ECE, IT" /></Field>
              </>
            )}
            <Field label="Graduation years * (comma-separated)"><input className={inputCls} value={form.graduationYears} onChange={set('graduationYears')} placeholder="2026, 2027" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min CGPA"><input className={inputCls} type="number" value={form.minCgpa} onChange={set('minCgpa')} /></Field>
              <Field label="Max active backlogs"><input className={inputCls} type="number" value={form.maxActiveBacklogs} onChange={set('maxActiveBacklogs')} /></Field>
              <Field label="Max total backlogs"><input className={inputCls} type="number" value={form.maxTotalBacklogs} onChange={set('maxTotalBacklogs')} /></Field>
            </div>
            <Field label="Application deadline"><input className={inputCls} type="datetime-local" value={form.applicationDeadline} onChange={set('applicationDeadline')} /></Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} loading={saving} disabled={!valid}>{saving ? 'Creating…' : 'Create draft'}</Button>
      </Card>
    </div>
  );
}

function ChipPicker({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return <p className="text-xs text-subtle">None available.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`rounded-pill px-3 py-1.5 text-sm font-medium ${
              on ? 'bg-primary-600 text-white' : 'bg-white text-body ring-1 ring-border hover:bg-primary-50'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
const areaCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
