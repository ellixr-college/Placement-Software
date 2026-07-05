'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@ellixr/ui';
import { importStudents, type ImportDefaults, type ImportResult } from '../../../../lib/students';
import { listMyCourses, type CollegeCourse } from '../../../../lib/courses';

// The nominal roll only lists reg no / name / email per row — course, branch,
// passout year and current year are set once on the form for the whole batch.
const TEMPLATE = 'regNo,name,email\nP03ZW24M015001,Nishank G,nishankg_001@sfscollege.in';

const CURRENT_YEAR = new Date().getFullYear();

export default function ImportStudentsPage() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [course, setCourse] = useState('');
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [currentYear, setCurrentYear] = useState('');
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMyCourses().then(setCourses).catch(() => {});
  }, []);

  const branchesFor = courses.find((c) => c.name === course)?.branches ?? [];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function onImport() {
    setError(null);
    setResult(null);
    if (!csv.trim()) {
      setError('Paste CSV content or choose a file first.');
      return;
    }
    if (!course.trim()) {
      setError('Pick the course this batch belongs to.');
      return;
    }
    if (!graduationYear.trim()) {
      setError('Enter the passout (graduation) year for this batch.');
      return;
    }
    setLoading(true);
    try {
      const defaults: ImportDefaults = {
        course: course.trim(),
        branch: branch.trim() || undefined,
        graduationYear: Number(graduationYear),
        currentYear: currentYear ? Number(currentYear) : undefined,
      };
      const res = await importStudents(csv, defaults);
      // Clean import → go to the list and show a confirmation there. If any rows
      // failed, stay here so the officer can see and fix the errors.
      if (res.errorCount === 0 && res.createdCount > 0) {
        router.push(`/students?imported=${res.createdCount}`);
        return;
      }
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Import students</h1>
        <Link href="/students" className="text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card className="space-y-5 p-6">
        {/* Batch settings */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-strong">Batch details</p>
            <p className="text-xs text-subtle">
              Applied to every student in this import (e.g. one nominal roll = MBA, II year, 2026).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-subtle">Course *</span>
              {courses.length > 0 ? (
                <select
                  className={inputCls}
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    setBranch('');
                  }}
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="MBA" />
              )}
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-subtle">Branch (optional)</span>
              {branchesFor.length > 0 ? (
                <select className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">All / none</option>
                  {branchesFor.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Finance" />
              )}
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-subtle">Passout year *</span>
              <input
                type="number"
                className={inputCls}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder={String(CURRENT_YEAR + 1)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-subtle">Current year of study (optional)</span>
              <select className={inputCls} value={currentYear} onChange={(e) => setCurrentYear(e.target.value)}>
                <option value="">Not tracked</option>
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
              </select>
            </label>
          </div>
        </div>

        {/* CSV */}
        <div className="space-y-1 border-t border-border pt-4">
          <p className="text-sm font-medium text-strong">CSV rows</p>
          <p className="text-xs text-subtle">
            First row is the header. Required columns: <b>regNo, name, email</b>. Optional:
            <b> enrollmentNumber, phone, cgpa, ugPercentage, tenthPercentage, twelfthPercentage, activeBacklogs, totalBacklogs</b>.
            Everyone is created
            with the password <b>password123</b> — students can change it later.
          </p>
          <pre className="overflow-x-auto rounded-md bg-app p-3 text-xs text-strong">{TEMPLATE}</pre>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Choose file…
          </Button>
          <Button variant="ghost" onClick={() => setCsv(TEMPLATE)}>
            Use template
          </Button>
        </div>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder="Paste CSV here…"
          className="w-full rounded-md border border-border bg-white p-3 font-mono text-xs outline-none focus:border-primary-400"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button size="lg" onClick={onImport} disabled={loading}>
          {loading ? 'Importing…' : 'Import students'}
        </Button>
      </Card>

      {result && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-success">{result.createdCount} created</span>
            {result.errorCount > 0 && (
              <span className="text-sm text-danger">{result.errorCount} failed</span>
            )}
          </div>

          {result.createdCount > 0 && (
            <p className="rounded-md bg-app px-3 py-2 text-sm text-strong">
              All {result.createdCount} students can sign in with their email and the password{' '}
              <span className="font-mono font-semibold">password123</span>.
            </p>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-danger">Errors</p>
              <ul className="space-y-1 text-xs text-subtle">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/students">
            <Button variant="ghost">Done</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
