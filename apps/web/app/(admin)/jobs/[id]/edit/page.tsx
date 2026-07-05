'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import {
  getJob,
  updateJob,
  uploadJobPdf,
  type ApplicationField,
  type ApplicationFieldType,
  type CreateJobInput,
  type Job,
} from '../../../../../lib/jobs';
import { listMyCourses, type CollegeCourse } from '../../../../../lib/courses';

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];
// Current passout year through +3, as batch chips (same as the post form).
const GRAD_YEARS = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() + i));

/**
 * Edit a job. Mirrors the "Post a job" form (single CTC, UG/PG %, grad-year chips,
 * PDF attach, deadline + time) so a posted job can be corrected in the same shape
 * it was created. Platform-broadcast jobs are read-only here.
 */
export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gradYears, setGradYears] = useState<string[]>([]);
  const toggleGradYear = (y: string) =>
    setGradYears((ys) => (ys.includes(y) ? ys.filter((x) => x !== y) : [...ys, y]));
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  // PDF: keep the existing one, replace it with a new upload, or remove it.
  const [file, setFile] = useState<File | null>(null);
  const [existingPdfName, setExistingPdfName] = useState<string | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
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
        setTitle(j.title);
        setCompanyName(j.companyName ?? '');
        setGradYears(j.graduationYears.map(String));
        setExistingPdfName(j.pdfUrl ? j.pdfName ?? 'Current PDF' : null);
        if (j.applicationDeadline) {
          const d = new Date(j.applicationDeadline);
          const pad = (n: number) => String(n).padStart(2, '0');
          setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          // Only prefill the time when it isn't the default end-of-day (23:59).
          if (!(d.getHours() === 23 && d.getMinutes() === 59)) {
            setDeadlineTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
          }
        }
        setDetails({
          description: j.description ?? '',
          jobType: j.jobType,
          workMode: j.workMode ?? '',
          location: j.location ?? '',
          // CTC is stored as an equal min/max pair → show the single figure.
          ctc: numStr(j.ctcMin ?? j.ctcMax),
          minUg: numStr(j.minUgPercentage),
          minPg: numStr(j.minCgpa),
        });
        setFormFields(j.applicationFormFields ?? []);
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

  const hasCatalog = courses.length > 0;
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    for (const name of pickedCourses) {
      courses.find((c) => c.name === name)?.branches.forEach((b) => set.add(b));
    }
    return [...set];
  }, [pickedCourses, courses]);

  // Chip options = the standard window ∪ any years already on the job (so an older
  // batch stays visible/removable instead of silently dropping off).
  const gradYearOptions = useMemo(
    () => [...new Set([...GRAD_YEARS, ...gradYears])].sort(),
    [gradYears],
  );

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

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      // PDF: replace (upload new), remove (clear), or leave untouched.
      let pdfUrl: string | undefined;
      let pdfName: string | undefined;
      if (file) {
        const up = await uploadJobPdf(file);
        pdfUrl = up.url;
        pdfName = up.name;
      } else if (removePdf) {
        pdfUrl = '';
        pdfName = '';
      }

      const input: Partial<CreateJobInput> = {
        title: title.trim(),
        companyName: companyName.trim() || undefined,
        eligibleCourses,
        eligibleBranches,
        graduationYears: gradYears.map(Number),
        description: details.description.trim() || undefined,
        jobType: details.jobType,
        workMode: details.workMode || undefined,
        location: details.location.trim() || undefined,
        // Single CTC → stored as both min & max so it shows as one figure.
        ctcMin: num(details.ctc),
        ctcMax: num(details.ctc),
        minCgpa: num(details.minPg), // PG/current % → student.cgpa (their Percentage)
        minUgPercentage: num(details.minUg), // UG % → student.ugPercentage
        applicationFormFields: cleanFields(formFields),
        applicationDeadline: deadline
          ? new Date(`${deadline}T${deadlineTime || '23:59'}:00`).toISOString()
          : undefined,
        ...(pdfUrl !== undefined ? { pdfUrl, pdfName } : {}),
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

  const newPdfChosen = !!file;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/jobs/${id}`} className="text-sm text-primary-600 hover:underline">
        ← Back to job
      </Link>
      <h1 className="text-2xl font-semibold text-strong">Edit job</h1>

      <Card className="space-y-4 p-5">
        <Field label="Job title *">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Business Development Executive" />
        </Field>
        <Field label="Company name">
          <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Infosys (optional)" />
        </Field>

        <Field label="Job description PDF">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemovePdf(false);
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {newPdfChosen || existingPdfName ? 'Replace PDF…' : 'Choose PDF…'}
            </Button>
            <span className="truncate text-sm text-subtle">
              {newPdfChosen
                ? file!.name
                : removePdf
                ? 'Will be removed on save'
                : existingPdfName ?? 'No file selected'}
            </span>
            {(existingPdfName || newPdfChosen) && !removePdf && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRemovePdf(!!existingPdfName);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="text-xs text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-subtle">Students can view this on the job. Max 10 MB.</p>
        </Field>

        <Field label="Job description (or type it, if the HR didn't send a PDF)">
          <textarea className={areaCls} rows={5} value={details.description} onChange={setD('description')} placeholder="Paste or type the job description here…" />
        </Field>

        <Field label="CTC (₹/yr) *">
          <input className={inputCls} type="number" value={details.ctc} onChange={setD('ctc')} placeholder="600000" />
          <span className="text-xs text-subtle">Shown to students on the job — required.</span>
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
              <ChipPicker options={gradYearOptions} selected={gradYears} onToggle={toggleGradYear} />
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
            <Field label="Location"><input className={inputCls} value={details.location} onChange={setD('location')} placeholder="Bangalore" /></Field>
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
          <Button onClick={submit} loading={saving} disabled={!valid || saving}>
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

const numStr = (n: number | null | undefined) => (n == null ? '' : String(n));

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
