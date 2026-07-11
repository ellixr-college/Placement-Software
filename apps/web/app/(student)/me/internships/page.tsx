'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { ListSkeleton } from '../../../../components/page-skeleton';
import {
  createMyInternship,
  deleteMyInternship,
  listMyInternships,
  updateMyInternship,
  type Internship,
  type InternshipInput,
} from '../../../../lib/internships';

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
          <Link href="/me/profile" className="text-sm text-primary-600">
            ← Profile
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-strong">My internships</h1>
          <p className="text-sm text-subtle">Add internships you found on your own.</p>
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
        <ListSkeleton />
      ) : items.length === 0 && editing === null ? (
        <Card className="p-6 text-center text-sm text-subtle">
          No internships yet. Add one so your placement office has it on record.
        </Card>
      ) : (
        items.map((i) => (
          <Card key={i.id} className="space-y-2 p-4">
            <div>
              <p className="font-semibold text-strong">{i.role}</p>
              <p className="text-xs text-subtle">
                {i.companyName}
                {i.location ? ` · ${i.location}` : ''}
              </p>
            </div>
            {i.description && <p className="text-sm text-body">{i.description}</p>}
            {(i.pocName || i.pocEmail || i.pocPhone) && (
              <div className="rounded-md bg-app px-3 py-2 text-xs text-subtle">
                <span className="font-medium text-body">Contact:</span>{' '}
                {[i.pocName, i.pocEmail, i.pocPhone].filter(Boolean).join(' · ')}
              </div>
            )}
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
          </Card>
        ))
      )}
    </div>
  );
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
    role: internship?.role ?? '',
    companyName: internship?.companyName ?? '',
    location: internship?.location ?? '',
    description: internship?.description ?? '',
    pocName: internship?.pocName ?? '',
    pocEmail: internship?.pocEmail ?? '',
    pocPhone: internship?.pocPhone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: InternshipInput = {
        role: form.role.trim(),
        companyName: form.companyName.trim(),
        location: form.location.trim(),
        description: form.description.trim() || undefined,
        pocName: form.pocName.trim(),
        pocEmail: form.pocEmail.trim(),
        pocPhone: form.pocPhone.trim(),
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

  const ready =
    form.companyName.trim().length >= 2 &&
    form.role.trim().length >= 2 &&
    form.location.trim().length >= 1 &&
    form.pocName.trim().length >= 1 &&
    form.pocEmail.trim().length >= 1 &&
    form.pocPhone.trim().length >= 1;

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">
        {internship ? 'Edit internship' : 'Add internship'}
      </p>
      <Labeled label="Position / title *">
        <input
          className={inputCls}
          value={form.role}
          onChange={set('role')}
          placeholder="Software Engineering Intern"
        />
      </Labeled>
      <Labeled label="Company *">
        <input className={inputCls} value={form.companyName} onChange={set('companyName')} />
      </Labeled>
      <Labeled label="Location *">
        <input
          className={inputCls}
          value={form.location}
          onChange={set('location')}
          placeholder="Bangalore / Remote"
        />
      </Labeled>
      <Labeled label="Short description">
        <textarea
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="What you worked on…"
        />
      </Labeled>

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold text-strong">Point of contact *</p>
        <div className="space-y-3">
          <Labeled label="Contact person *">
            <input
              className={inputCls}
              value={form.pocName}
              onChange={set('pocName')}
              placeholder="Name / designation"
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Email *">
              <input
                className={inputCls}
                type="email"
                value={form.pocEmail}
                onChange={set('pocEmail')}
                placeholder="hr@company.com"
              />
            </Labeled>
            <Labeled label="Phone *">
              <input
                className={inputCls}
                value={form.pocPhone}
                onChange={set('pocPhone')}
                placeholder="+91 98765 43210"
              />
            </Labeled>
          </div>
        </div>
      </div>

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
