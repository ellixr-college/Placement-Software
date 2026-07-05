'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { listMyCourses, type CollegeCourse } from '../../../../lib/courses';
import {
  createJob,
  publishJob,
  uploadJobPdf,
  type ApplicationField,
  type ApplicationFieldType,
} from '../../../../lib/jobs';

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];
// Current passout year through +3, as batch chips.
const GRAD_YEARS = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() + i));

/**
 * Post a job. HRs send JDs ~50:50 as a PDF or as typed text — this one form does
 * both: upload the PDF, or type the description + details (or both). Only title +
 * eligibility are required; everything else is optional.
 */
export default function QuickPostPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gradYears, setGradYears] = useState<string[]>([]);
  const toggleGradYear = (y: string) =>
    setGradYears((ys) => (ys.includes(y) ? ys.filter((x) => x !== y) : [...ys, y]));
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pickedCourses, setPickedCourses] = useState<string[]>([]);
  const [pickedBranches, setPickedBranches] = useState<string[]>([]);
  const [coursesText, setCoursesText] = useState('');
  const [branchesText, setBranchesText] = useState('');
  // Optional typed fields (used when the HR sends a "LinkedIn-style" JD, not a PDF).
  const [details, setDetails] = useState({
    description: '',
    jobType: 'FULL_TIME',
    workMode: '',
    location: '',
    ctc: '',
    minUg: '', // min UG %  (undergrad)
    minPg: '', // min PG %  (current/postgrad — student's Percentage)
  });
  const setD =
    (k: keyof typeof details) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setDetails((d) => ({ ...d, [k]: e.target.value }));
  const [formFields, setFormFields] = useState<ApplicationField[]>([]);
  const [saving, setSaving] = useState<false | 'draft' | 'publish'>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyCourses().then(setCourses).catch(() => {});
  }, []);

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

  const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const eligibleCourses = hasCatalog ? pickedCourses : splitList(coursesText);
  const eligibleBranches = hasCatalog ? pickedBranches : splitList(branchesText);

  const valid = title.trim() && eligibleCourses.length && gradYears.length > 0 && details.ctc.trim() !== '';

  async function submit(publish: boolean) {
    setSaving(publish ? 'publish' : 'draft');
    setError(null);
    try {
      let pdfUrl: string | undefined;
      let pdfName: string | undefined;
      if (file) {
        const up = await uploadJobPdf(file);
        pdfUrl = up.url;
        pdfName = up.name;
      }
      const job = await createJob({
        title: title.trim(),
        companyName: companyName.trim() || undefined,
        eligibleCourses,
        eligibleBranches,
        graduationYears: gradYears.map(Number),
        pdfUrl,
        pdfName,
        // Optional typed details (LinkedIn-style JD).
        description: details.description.trim() || undefined,
        jobType: details.jobType,
        workMode: details.workMode || undefined,
        location: details.location.trim() || undefined,
        // Single CTC value → stored as both min & max so it shows as one figure.
        ctcMin: num(details.ctc),
        ctcMax: num(details.ctc),
        minCgpa: num(details.minPg), // PG/current % → student.cgpa (their Percentage)
        minUgPercentage: num(details.minUg), // UG % → student.ugPercentage
        applicationFormFields: formFields.length > 0 ? cleanFields(formFields) : undefined,
        // Optional time; defaults to end of that day (23:59) if left blank.
        applicationDeadline: deadline
          ? new Date(`${deadline}T${deadlineTime || '23:59'}:00`).toISOString()
          : undefined,
      });
      // Publish straight away (notifies students) or leave as a draft.
      if (publish) await publishJob(job.id);
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create job');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/jobs" className="text-sm text-primary-600 hover:underline">← Jobs</Link>
      <div>
        <h1 className="text-2xl font-semibold text-strong">Post a job</h1>
        <p className="text-sm text-subtle">
          Upload the JD (PDF) and pick who can apply. Saved as a draft — publish to notify students.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <Field label="Job title *">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Business Development Executive" />
        </Field>
        <Field label="Company name">
          <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Infosys (optional)" />
        </Field>

        <Field label="Job description PDF">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {file ? 'Change PDF' : 'Choose PDF…'}
            </Button>
            <span className="truncate text-sm text-subtle">{file ? file.name : 'No file selected'}</span>
          </div>
          <p className="text-xs text-subtle">Students can view this on the job. Max 10 MB.</p>
        </Field>

        <Field label="Job description (or type it, if the HR didn't send a PDF)">
          <textarea className={areaCls} rows={5} value={details.description} onChange={setD('description')} placeholder="Paste or type the job description here…" />
        </Field>

        <div className="border-t border-border pt-4">
          <p className="mb-1 text-sm font-semibold text-strong">Who can apply</p>
          <p className="mb-3 text-xs text-subtle">Only students in the selected courses/branches can apply.</p>
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
                  <input className={inputCls} value={coursesText} onChange={(e) => setCoursesText(e.target.value)} placeholder="B.Tech, MBA" />
                </Field>
                <Field label="Eligible branches (comma-separated, optional)">
                  <input className={inputCls} value={branchesText} onChange={(e) => setBranchesText(e.target.value)} placeholder="CSE, ECE" />
                </Field>
              </>
            )}
            <Field label="Graduation years *">
              <ChipPicker options={GRAD_YEARS} selected={gradYears} onToggle={toggleGradYear} />
            </Field>
            <Field label="Last date to apply">
              <div className="flex gap-2">
                <input className={inputCls} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <input className="h-10 w-32 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400" type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
              </div>
              <span className="text-xs text-subtle">Leave time blank to close at 11:59 PM that day.</span>
            </Field>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-1 text-sm font-semibold text-strong">More details (optional)</p>
          <p className="mb-3 text-xs text-subtle">Fill any of these — handy when the JD is typed, not a PDF.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Job type">
                <select className={inputCls} value={details.jobType} onChange={setD('jobType')}>
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Work mode">
                <select className={inputCls} value={details.workMode} onChange={setD('workMode')}>
                  <option value="">Not specified</option>
                  {WORK_MODES.map((m) => <option key={m} value={m}>{m === 'ONSITE' ? 'Work from office' : m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location"><input className={inputCls} value={details.location} onChange={setD('location')} placeholder="Bangalore" /></Field>
              <Field label="CTC (₹/yr) *"><input className={inputCls} type="number" value={details.ctc} onChange={setD('ctc')} placeholder="600000" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min UG %"><input className={inputCls} type="number" value={details.minUg} onChange={setD('minUg')} placeholder="60" /></Field>
              <Field label="Min PG %"><input className={inputCls} type="number" value={details.minPg} onChange={setD('minPg')} placeholder="60" /></Field>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-1 text-sm font-semibold text-strong">Custom application questions (optional)</p>
          <p className="mb-3 text-xs text-subtle">Extra questions students answer when applying.</p>
          <FormBuilder fields={formFields} onChange={setFormFields} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={() => submit(true)} loading={saving === 'publish'} disabled={!valid || !!saving}>
            {saving === 'publish' ? 'Publishing…' : 'Publish'}
          </Button>
          <Button
            variant="outline"
            onClick={() => submit(false)}
            loading={saving === 'draft'}
            disabled={!valid || !!saving}
          >
            {saving === 'draft' ? 'Saving…' : 'Save as draft'}
          </Button>
        </div>
        <p className="text-xs text-subtle">
          Publish notifies all students immediately. Save as draft to publish later.
        </p>
      </Card>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
const areaCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

const FIELD_TYPES: { value: ApplicationFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
];

// Drop incomplete rows and normalise select options before submit.
function cleanFields(fields: ApplicationField[]): ApplicationField[] {
  return fields
    .filter((f) => f.label.trim())
    .map((f) => ({
      id: f.id,
      label: f.label.trim(),
      type: f.type,
      required: f.required ?? false,
      ...(f.type === 'select' ? { options: (f.options ?? []).filter(Boolean) } : {}),
    }));
}

function FormBuilder({
  fields,
  onChange,
}: {
  fields: ApplicationField[];
  onChange: (f: ApplicationField[]) => void;
}) {
  function add() {
    onChange([...fields, { id: `q${Date.now().toString(36)}`, label: '', type: 'text', required: false }]);
  }
  function update(i: number, patch: Partial<ApplicationField>) {
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function remove(i: number) {
    onChange(fields.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.id} className="space-y-2 rounded-card border border-border p-3">
          <div className="flex gap-2">
            <input className={inputCls} value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Question label" />
            <select
              className="h-10 w-36 shrink-0 rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary-400"
              value={f.type}
              onChange={(e) => update(i, { type: e.target.value as ApplicationFieldType })}
            >
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {f.type === 'select' && (
            <input
              className={inputCls}
              value={(f.options ?? []).join(', ')}
              onChange={(e) => update(i, { options: e.target.value.split(',').map((s) => s.trim()) })}
              placeholder="Options, comma-separated"
            />
          )}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-subtle">
              <input type="checkbox" checked={f.required ?? false} onChange={(e) => update(i, { required: e.target.checked })} />
              Required
            </label>
            <button type="button" onClick={() => remove(i)} className="text-xs text-danger hover:underline">
              Remove
            </button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        Add question
      </Button>
    </div>
  );
}

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
