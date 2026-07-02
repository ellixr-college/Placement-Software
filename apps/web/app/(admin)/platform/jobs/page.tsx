'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import { listColleges, type College } from '../../../../lib/colleges';
import {
  listPlatformJobs,
  createPlatformJob,
  publishPlatformJob,
  closePlatformJob,
  type PlatformJob,
} from '../../../../lib/platform-jobs';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

const JOB_TYPES = ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

export default function PlatformJobsPage() {
  const [items, setItems] = useState<PlatformJob[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh(s = status) {
    setLoading(true);
    setError(null);
    try {
      setItems(await listPlatformJobs(s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    listColleges().then((c) => setColleges(c.filter((x) => x.isActive))).catch(() => {});
  }, []);

  const collegeName = (id: string) => colleges.find((c) => c.id === id)?.name ?? id;

  async function act(id: string, fn: (id: string) => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Platform jobs</h1>
          <p className="text-sm text-subtle">
            Broadcast a posting to the colleges you select. Each college manages only its own applicants.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)} variant={creating ? 'outline' : 'primary'}>
          {creating ? 'Cancel' : 'Broadcast a job'}
        </Button>
      </header>

      {creating && (
        <NewPlatformJobForm
          colleges={colleges}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      <div className="flex gap-2">
        {['', 'DRAFT', 'PUBLISHED', 'CLOSED'].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatus(s)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
              status === s ? 'bg-primary-600 text-white' : 'bg-white text-body hover:bg-primary-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Colleges</th>
              <th className="px-4 py-3 font-medium">Applicants</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-subtle">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-subtle">No platform jobs yet.</td></tr>
            ) : (
              items.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3 font-medium text-strong">{j.title}</td>
                  <td className="px-4 py-3">{j.companyName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span title={(j.targetCollegeIds ?? []).map(collegeName).join(', ')}>
                      {(j.targetCollegeIds ?? []).length} college
                      {(j.targetCollegeIds ?? []).length === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{j.applicationCount ?? 0}</td>
                  <td className="px-4 py-3"><Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {j.status === 'DRAFT' && (
                        <Button size="sm" loading={busyId === j.id} onClick={() => act(j.id, publishPlatformJob)}>
                          Publish
                        </Button>
                      )}
                      {j.status !== 'CLOSED' && (
                        <Button size="sm" variant="outline" loading={busyId === j.id} onClick={() => act(j.id, closePlatformJob)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewPlatformJobForm({
  colleges,
  onCreated,
}: {
  colleges: College[];
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    title: '',
    companyName: '',
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
  const [targets, setTargets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleTarget = (id: string) =>
    setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const numList = (v: string) => splitList(v).map(Number).filter((n) => !Number.isNaN(n));
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createPlatformJob({
        title: form.title,
        companyName: form.companyName,
        targetCollegeIds: targets,
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
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create job');
      setSaving(false);
    }
  }

  const valid =
    form.title.trim() &&
    form.companyName.trim() &&
    targets.length &&
    splitList(form.eligibleCourses).length &&
    splitList(form.eligibleBranches).length &&
    numList(form.graduationYears).length;

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-semibold text-strong">Broadcast a job</p>
      <p className="text-sm text-subtle">
        Created as a draft. Publish it to make it visible to students at the selected colleges.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title *"><input className={inputCls} value={form.title} onChange={set('title')} /></Field>
        <Field label="Company *"><input className={inputCls} value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" /></Field>
      </div>

      <Field label="Target colleges *">
        {colleges.length === 0 ? (
          <p className="text-sm text-subtle">No active colleges available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {colleges.map((c) => {
              const on = targets.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleTarget(c.id)}
                  className={`rounded-pill px-3 py-1.5 text-sm font-medium ${
                    on ? 'bg-primary-600 text-white' : 'bg-white text-body ring-1 ring-muted hover:bg-primary-50'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
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
            <Field label="Min %"><input className={inputCls} type="number" value={form.minCgpa} onChange={set('minCgpa')} placeholder="60" /></Field>
            <Field label="Max active backlogs"><input className={inputCls} type="number" value={form.maxActiveBacklogs} onChange={set('maxActiveBacklogs')} /></Field>
            <Field label="Max total backlogs"><input className={inputCls} type="number" value={form.maxTotalBacklogs} onChange={set('maxTotalBacklogs')} /></Field>
          </div>
          <Field label="Application deadline"><input className={inputCls} type="datetime-local" value={form.applicationDeadline} onChange={set('applicationDeadline')} /></Field>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={saving} disabled={!valid}>{saving ? 'Creating…' : 'Create draft'}</Button>
    </Card>
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
