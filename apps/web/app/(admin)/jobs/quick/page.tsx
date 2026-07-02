'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { listCompanies, type Company } from '../../../../lib/companies';
import { listMyCourses, type CollegeCourse } from '../../../../lib/courses';
import { createJob, uploadJobPdf } from '../../../../lib/jobs';

/**
 * Fast job posting: upload the company's JD PDF + pick who can apply. Everything
 * else (CTC, CGPA, custom form…) is optional and lives on the full "Post a job"
 * form. Creates a draft; publish from the job page to notify students.
 */
export default function QuickPostPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [graduationYears, setGraduationYears] = useState('');
  const [file, setFile] = useState<File | null>(null);
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
  const numList = (v: string) => splitList(v).map(Number).filter((n) => !Number.isNaN(n));
  const eligibleCourses = hasCatalog ? pickedCourses : splitList(coursesText);
  const eligibleBranches = hasCatalog ? pickedBranches : splitList(branchesText);

  const valid = title.trim() && companyId && eligibleCourses.length && numList(graduationYears).length;

  async function submit() {
    setSaving(true);
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
        companyId,
        eligibleCourses,
        eligibleBranches,
        graduationYears: numList(graduationYears),
        pdfUrl,
        pdfName,
      });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create job');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/jobs" className="text-sm text-primary-600 hover:underline">← Jobs</Link>
        <Link href="/jobs/new" className="text-sm text-subtle hover:underline">Use full form →</Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-strong">Quick post</h1>
        <p className="text-sm text-subtle">
          Upload the company&apos;s JD and pick who can apply. Saved as a draft — publish to notify students.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <Field label="Title *">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Business Development Executive" />
        </Field>
        <Field label="Company *">
          <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Select a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
            <Field label="Graduation years * (comma-separated)">
              <input className={inputCls} value={graduationYears} onChange={(e) => setGraduationYears(e.target.value)} placeholder="2026, 2027" />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} loading={saving} disabled={!valid}>
          {saving ? 'Posting…' : 'Create draft'}
        </Button>
      </Card>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

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
