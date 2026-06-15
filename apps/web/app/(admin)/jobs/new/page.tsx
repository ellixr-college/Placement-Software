'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { listCompanies, type Company } from '../../../../lib/companies';
import { createJob } from '../../../../lib/jobs';

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

export default function NewJobPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
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
    eligibleCourses: '',
    eligibleBranches: '',
    graduationYears: '',
    minCgpa: '',
    maxActiveBacklogs: '',
    maxTotalBacklogs: '',
    applicationDeadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCompanies().then((c) => {
      setCompanies(c.filter((x) => x.isActive));
    });
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const numList = (v: string) => splitList(v).map(Number).filter((n) => !Number.isNaN(n));
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

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
        eligibleCourses: splitList(form.eligibleCourses),
        eligibleBranches: splitList(form.eligibleBranches),
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
    form.title.trim() &&
    form.companyId &&
    splitList(form.eligibleCourses).length &&
    splitList(form.eligibleBranches).length &&
    numList(form.graduationYears).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/jobs" className="text-sm text-primary-600 hover:underline">← Jobs</Link>
      <h1 className="text-2xl font-semibold text-strong">Post a job</h1>
      <p className="text-sm text-subtle">Created as a draft. Publish it to compute the eligible student set.</p>

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
          <p className="mb-3 text-sm font-semibold text-strong">Eligibility criteria</p>
          <div className="space-y-3">
            <Field label="Eligible courses * (comma-separated)"><input className={inputCls} value={form.eligibleCourses} onChange={set('eligibleCourses')} placeholder="B.Tech, M.Tech" /></Field>
            <Field label="Eligible branches * (comma-separated)"><input className={inputCls} value={form.eligibleBranches} onChange={set('eligibleBranches')} placeholder="CSE, ECE, IT" /></Field>
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
