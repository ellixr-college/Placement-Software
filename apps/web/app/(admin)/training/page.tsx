'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, SectionCard } from '@ellixr/ui';
import { useConfirm } from '../../../components/confirm-provider';
import {
  CATEGORY_LABELS,
  TRAINING_CATEGORIES,
  createProgram,
  deleteProgram,
  listPrograms,
  updateProgram,
  type ProgramInput,
  type TrainingCategory,
  type TrainingProgram,
} from '../../../lib/training';

export default function TrainingPage() {
  const confirm = useConfirm();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrainingProgram | 'new' | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPrograms(await listPrograms());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training programs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(p: TrainingProgram) {
    const ok = await confirm({
      title: `Delete “${p.name}”?`,
      message: 'This removes the program and every student record under it. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProgram(p.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete program');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Training &amp; Employability</h1>
          <p className="text-sm text-subtle">
            {programs.length} program{programs.length === 1 ? '' : 's'} · record attendance, scores
            and readiness per student from their profile.
          </p>
        </div>
        <Button onClick={() => setEditing((e) => (e === null ? 'new' : null))}>
          {editing !== null ? 'Cancel' : 'New program'}
        </Button>
      </header>

      {editing !== null && (
        <ProgramForm
          program={editing === 'new' ? null : editing}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-subtle">
                  Loading…
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-subtle">
                  No training programs yet. Create one to start tracking employability.
                </td>
              </tr>
            ) : (
              programs.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-strong">{p.name}</span>
                    {p.description && <p className="text-xs text-subtle">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tint="lavender">{CATEGORY_LABELS[p.category]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-subtle">{fmtRange(p.startDate, p.endDate)}</td>
                  <td className="px-4 py-3">{p._count?.records ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditing(p)}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="text-xs text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <SectionCard title="How readiness is scored">
        <p className="text-sm text-body">
          A student&apos;s employability readiness is the average of their aptitude, communication
          and interview scores (set from the student&apos;s profile) together with their training
          completion rate. Enrol students into a program and mark records from each
          student&apos;s detail page.
        </p>
      </SectionCard>
    </div>
  );
}

function fmtRange(start: string | null, end: string | null): string {
  const f = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  if (start && end) return `${f(start)} – ${f(end)}`;
  if (start) return `From ${f(start)}`;
  if (end) return `Until ${f(end)}`;
  return '—';
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function ProgramForm({
  program,
  onSaved,
}: {
  program: TrainingProgram | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: program?.name ?? '',
    category: (program?.category ?? 'OTHER') as TrainingCategory,
    description: program?.description ?? '',
    startDate: program?.startDate ? program.startDate.slice(0, 10) : '',
    endDate: program?.endDate ? program.endDate.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: ProgramInput = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      if (program) await updateProgram(program.id, input);
      else await createProgram(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save program');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Program name *</span>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Aptitude Bootcamp"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Category</span>
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TrainingCategory }))}
          >
            {TRAINING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">Start date</span>
          <input
            type="date"
            className={inputCls}
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-subtle">End date</span>
          <input
            type="date"
            className={inputCls}
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-subtle">Description</span>
        <textarea
          className={inputCls}
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={saving} disabled={!form.name.trim()}>
        {saving ? 'Saving…' : program ? 'Save changes' : 'Create program'}
      </Button>
    </Card>
  );
}
