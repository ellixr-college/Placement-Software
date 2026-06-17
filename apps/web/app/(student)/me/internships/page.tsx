'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  WORK_MODES,
  createMyInternship,
  deleteMyInternship,
  listMyInternships,
  updateMyInternship,
  type Internship,
  type InternshipInput,
  type InternshipStatus,
  type WorkMode,
} from '../../../../lib/internships';

const STATUS_TINT: Record<InternshipStatus, 'mint' | 'cream' | 'rose'> = {
  VERIFIED: 'mint',
  PENDING: 'cream',
  REJECTED: 'rose',
};

export default function MyInternshipsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Internship | 'new' | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listMyInternships());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load internships');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(i: Internship) {
    const ok = await confirm({
      title: `Delete ${i.companyName} internship?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteMyInternship(i.id);
    load();
  }

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/me" className="text-sm text-primary-600">
            ← Home
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-strong">Internships</h1>
        </div>
        {editing === null && <Button onClick={() => setEditing('new')}>Add</Button>}
      </header>

      {editing !== null && (
        <InternshipForm
          internship={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : items.length === 0 && editing === null ? (
        <Card className="p-6 text-center text-sm text-subtle">
          No internships yet. Add one — your placement office will verify it.
        </Card>
      ) : (
        items.map((i) => (
          <Card key={i.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-strong">{i.role}</p>
                <p className="text-xs text-subtle">
                  {i.companyName}
                  {i.location ? ` · ${i.location}` : ''}
                  {i.workMode ? ` · ${i.workMode}` : ''}
                </p>
              </div>
              <Badge tint={STATUS_TINT[i.status]}>{i.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
              {(i.startDate || i.endDate) && (
                <span>
                  {fmt(i.startDate)} – {fmt(i.endDate)}
                </span>
              )}
              {i.isPaid && <span>Paid{i.stipend != null ? ` · ₹${i.stipend}/mo` : ''}</span>}
              {i.isPpo && <span className="font-medium text-primary-600">PPO</span>}
            </div>
            {i.status === 'REJECTED' && i.rejectionReason && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                Officer feedback: {i.rejectionReason}
              </p>
            )}
            {i.status !== 'VERIFIED' && (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditing(i)}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(i)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function InternshipForm({
  internship,
  onClose,
  onSaved,
}: {
  internship: Internship | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    companyName: internship?.companyName ?? '',
    role: internship?.role ?? '',
    workMode: (internship?.workMode ?? '') as WorkMode | '',
    location: internship?.location ?? '',
    isPaid: internship?.isPaid ?? false,
    stipend: internship?.stipend?.toString() ?? '',
    startDate: internship?.startDate ? internship.startDate.slice(0, 10) : '',
    endDate: internship?.endDate ? internship.endDate.slice(0, 10) : '',
    isPpo: internship?.isPpo ?? false,
    description: internship?.description ?? '',
    certificateUrl: internship?.certificateUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: InternshipInput = {
        companyName: form.companyName.trim(),
        role: form.role.trim(),
        workMode: form.workMode || undefined,
        location: form.location.trim() || undefined,
        isPaid: form.isPaid,
        stipend: form.stipend.trim() ? Number(form.stipend) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isPpo: form.isPpo,
        description: form.description.trim() || undefined,
        certificateUrl: form.certificateUrl.trim() || undefined,
      };
      if (internship) await updateMyInternship(internship.id, input);
      else await createMyInternship(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save internship');
    } finally {
      setSaving(false);
    }
  }

  const ready = form.companyName.trim().length >= 2 && form.role.trim().length >= 2;

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">
        {internship ? 'Edit internship' : 'Add internship'}
      </p>
      <Labeled label="Company *">
        <input
          className={inputCls}
          value={form.companyName}
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
        />
      </Labeled>
      <Labeled label="Role / title *">
        <input
          className={inputCls}
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          placeholder="Software Engineering Intern"
        />
      </Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Work mode">
          <select
            className={inputCls}
            value={form.workMode}
            onChange={(e) => setForm((f) => ({ ...f, workMode: e.target.value as WorkMode | '' }))}
          >
            <option value="">—</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Location">
          <input
            className={inputCls}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Start date">
          <input
            type="date"
            className={inputCls}
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </Labeled>
        <Labeled label="End date">
          <input
            type="date"
            className={inputCls}
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </Labeled>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isPaid}
            onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
          />
          Paid internship
        </label>
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isPpo}
            onChange={(e) => setForm((f) => ({ ...f, isPpo: e.target.checked }))}
          />
          Converted to PPO
        </label>
      </div>
      {form.isPaid && (
        <Labeled label="Stipend (₹/month)">
          <input
            type="number"
            className={inputCls}
            value={form.stipend}
            onChange={(e) => setForm((f) => ({ ...f, stipend: e.target.value }))}
          />
        </Labeled>
      )}
      <Labeled label="Certificate URL">
        <input
          className={inputCls}
          value={form.certificateUrl}
          onChange={(e) => setForm((f) => ({ ...f, certificateUrl: e.target.value }))}
          placeholder="https://…"
        />
      </Labeled>
      <Labeled label="Description">
        <textarea
          className={inputCls}
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </Labeled>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} loading={saving} disabled={!ready}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
