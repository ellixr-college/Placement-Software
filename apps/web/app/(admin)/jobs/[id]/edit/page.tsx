'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { getJob, updateJob, type CreateJobInput, type Job } from '../../../../../lib/jobs';
import { listMyCourses, type CollegeCourse } from '../../../../../lib/courses';

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    jobType: 'FULL_TIME',
    workMode: '',
    location: '',
    experienceMin: '',
    experienceMax: '',
    ctcMin: '',
    ctcMax: '',
    graduationYears: '',
    minCgpa: '',
    minTenthPercentage: '',
    minTwelfthPercentage: '',
    maxActiveBacklogs: '',
    maxTotalBacklogs: '',
    applicationDeadline: '',
  });
  const [pickedGenders, setPickedGenders] = useState<string[]>([]);
  // Eligibility courses/branches — catalog chip selection + free-text fallback.
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [pickedCourses, setPickedCourses] = useState<string[]>([]);
  const [pickedBranches, setPickedBranches] = useState<string[]>([]);
  const [coursesText, setCoursesText] = useState('');
  const [branchesText, setBranchesText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [j] = await Promise.all([
          getJob(id),
          listMyCourses().then(setCourses).catch(() => {}),
        ]);
        setJob(j);
        setForm({
          title: j.title,
          description: j.description ?? '',
          jobType: j.jobType,
          workMode: j.workMode ?? '',
          location: j.location ?? '',
          experienceMin: numStr(j.experienceMin),
          experienceMax: numStr(j.experienceMax),
          ctcMin: numStr(j.ctcMin),
          ctcMax: numStr(j.ctcMax),
          graduationYears: j.graduationYears.join(', '),
          minCgpa: numStr(j.minCgpa),
          minTenthPercentage: numStr(j.minTenthPercentage),
          minTwelfthPercentage: numStr(j.minTwelfthPercentage),
          maxActiveBacklogs: numStr(j.maxActiveBacklogs),
          maxTotalBacklogs: numStr(j.maxTotalBacklogs),
          applicationDeadline: j.applicationDeadline ? toLocalInput(j.applicationDeadline) : '',
        });
        setPickedGenders(j.eligibleGenders ?? []);
        setPickedCourses(j.eligibleCourses);
        setPickedBranches(j.eligibleBranches);
        setCoursesText(j.eligibleCourses.join(', '));
        setBranchesText(j.eligibleBranches.join(', '));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleGender = (g: string) =>
    setPickedGenders((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

  const hasCatalog = courses.length > 0;
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    for (const name of pickedCourses) {
      courses.find((c) => c.name === name)?.branches.forEach((b) => set.add(b));
    }
    return [...set];
  }, [pickedCourses, courses]);

  function toggleCourse(name: string) {
    setPickedCourses((cs) => {
      const next = cs.includes(name) ? cs.filter((x) => x !== name) : [...cs, name];
      const allowed = new Set(next.flatMap((n) => courses.find((c) => c.name === n)?.branches ?? []));
      setPickedBranches((bs) => bs.filter((b) => allowed.has(b)));
      return next;
    });
  }
  const toggleBranch = (b: string) =>
    setPickedBranches((bs) => (bs.includes(b) ? bs.filter((x) => x !== b) : [...bs, b]));

  const eligibleCourses = hasCatalog ? pickedCourses : splitList(coursesText);
  const eligibleBranches = hasCatalog ? pickedBranches : splitList(branchesText);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: Partial<CreateJobInput> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        jobType: form.jobType,
        workMode: form.workMode || undefined,
        location: form.location.trim() || undefined,
        experienceMin: num(form.experienceMin),
        experienceMax: num(form.experienceMax),
        ctcMin: num(form.ctcMin),
        ctcMax: num(form.ctcMax),
        eligibleCourses,
        eligibleBranches,
        graduationYears: numList(form.graduationYears),
        minCgpa: num(form.minCgpa),
        minTenthPercentage: num(form.minTenthPercentage),
        minTwelfthPercentage: num(form.minTwelfthPercentage),
        eligibleGenders: pickedGenders,
        maxActiveBacklogs: num(form.maxActiveBacklogs),
        maxTotalBacklogs: num(form.maxTotalBacklogs),
        applicationDeadline: form.applicationDeadline
          ? new Date(form.applicationDeadline).toISOString()
          : undefined,
      };
      await updateJob(id, input);
      router.push(`/jobs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
      setSaving(false);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!job) return <p className="text-danger">{error ?? 'Job not found'}</p>;
  if (job.isPlatform) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Link href={`/jobs/${id}`} className="text-sm text-primary-600 hover:underline">
          ← Back
        </Link>
        <p className="rounded-md bg-tint-lavender px-3 py-2 text-sm text-body">
          This is a platform-broadcast job — it can only be edited by the platform team.
        </p>
      </div>
    );
  }

  const valid = form.title.trim() && eligibleCourses.length && numList(form.graduationYears).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/jobs/${id}`} className="text-sm text-primary-600 hover:underline">
        ← Back to job
      </Link>
      <h1 className="text-2xl font-semibold text-strong">Edit job</h1>

      <Card className="space-y-4 p-5">
        <Field label="Title *">
          <input className={inputCls} value={form.title} onChange={set('title')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job type">
            <select className={inputCls} value={form.jobType} onChange={set('jobType')}>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Work mode">
            <select className={inputCls} value={form.workMode} onChange={set('workMode')}>
              <option value="">Not specified</option>
              {WORK_MODES.map((m) => (
                <option key={m} value={m}>
                  {m === 'ONSITE' ? 'Work from office' : m.charAt(0) + m.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Location">
            <input className={inputCls} value={form.location} onChange={set('location')} />
          </Field>
          <Field label="Min experience (yrs)">
            <input className={inputCls} type="number" value={form.experienceMin} onChange={set('experienceMin')} />
          </Field>
          <Field label="Max experience (yrs)">
            <input className={inputCls} type="number" value={form.experienceMax} onChange={set('experienceMax')} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={areaCls} rows={4} value={form.description} onChange={set('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTC min (₹/yr)">
            <input className={inputCls} type="number" value={form.ctcMin} onChange={set('ctcMin')} />
          </Field>
          <Field label="CTC max (₹/yr)">
            <input className={inputCls} type="number" value={form.ctcMax} onChange={set('ctcMax')} />
          </Field>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold text-strong">Who can apply</p>
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
                <Field label="Eligible courses * (comma-separated)">
                  <input className={inputCls} value={coursesText} onChange={(e) => setCoursesText(e.target.value)} placeholder="B.Tech, M.Tech" />
                </Field>
                <Field label="Eligible branches (comma-separated, optional)">
                  <input className={inputCls} value={branchesText} onChange={(e) => setBranchesText(e.target.value)} placeholder="CSE, ECE" />
                </Field>
              </>
            )}
            <Field label="Graduation years * (comma-separated)">
              <input className={inputCls} value={form.graduationYears} onChange={set('graduationYears')} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min CGPA">
                <input className={inputCls} type="number" value={form.minCgpa} onChange={set('minCgpa')} />
              </Field>
              <Field label="Min 10th %">
                <input className={inputCls} type="number" value={form.minTenthPercentage} onChange={set('minTenthPercentage')} />
              </Field>
              <Field label="Min 12th %">
                <input className={inputCls} type="number" value={form.minTwelfthPercentage} onChange={set('minTwelfthPercentage')} />
              </Field>
              <Field label="Max active backlogs">
                <input className={inputCls} type="number" value={form.maxActiveBacklogs} onChange={set('maxActiveBacklogs')} />
              </Field>
              <Field label="Max total backlogs">
                <input className={inputCls} type="number" value={form.maxTotalBacklogs} onChange={set('maxTotalBacklogs')} />
              </Field>
            </div>
            <Field label="Eligible genders (leave empty = any)">
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => {
                  const on = pickedGenders.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGender(g)}
                      className={`rounded-pill px-3 py-1.5 text-sm font-medium ${
                        on ? 'bg-primary-600 text-white' : 'bg-white text-body ring-1 ring-border hover:bg-primary-50'
                      }`}
                    >
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Application deadline">
              <input
                className={inputCls}
                type="datetime-local"
                value={form.applicationDeadline}
                onChange={set('applicationDeadline')}
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={submit} loading={saving} disabled={!valid}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Link href={`/jobs/${id}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </Card>
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

const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
const numList = (v: string) => splitList(v).map(Number).filter((n) => !Number.isNaN(n));
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
const numStr = (n: number | null | undefined) => (n == null ? '' : String(n));

// ISO → "YYYY-MM-DDTHH:mm" in local time for <input type=datetime-local>.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
