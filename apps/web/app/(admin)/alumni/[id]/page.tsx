'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card } from '@ellixr/ui';
import {
  deleteAlumni,
  getAlumni,
  updateAlumni,
  type Alumni,
  type AlumniInput,
} from '../../../../lib/alumni';

export default function AlumniDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function load() {
    try {
      setAlumni(await getAlumni(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alumnus');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function remove() {
    if (!confirm('Remove this alumnus permanently?')) return;
    try {
      await deleteAlumni(id);
      router.push('/alumni');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove alumnus');
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!alumni) return <p className="text-danger">{error ?? 'Alumnus not found'}</p>;

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/alumni" className="text-sm text-primary-600 hover:underline">
          ← Alumni
        </Link>
        <EditAlumniForm
          alumni={alumni}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setAlumni(updated);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/alumni" className="text-sm text-primary-600 hover:underline">
        ← Alumni
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">
            {alumni.fullName}
            {!alumni.isActive && <span className="ml-2 text-sm text-subtle">(inactive)</span>}
          </h1>
          <p className="text-sm text-subtle">
            {alumni.branch} · Batch {alumni.graduationYear}
            {alumni.course ? ` · ${alumni.course}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {alumni.isMentor && <Badge tint="lavender">Mentor</Badge>}
            {alumni.isHiring && <Badge tint="mint">Hiring</Badge>}
            {alumni.tags.map((t) => (
              <Badge key={t} tint="cream">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={remove}>
            Remove
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-strong">Contact</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info label="Email" value={alumni.email} />
          <Info label="Phone" value={alumni.phone} />
          <Info
            label="LinkedIn"
            value={
              alumni.linkedinUrl ? (
                <a
                  href={alumni.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  View profile
                </a>
              ) : null
            }
          />
        </dl>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-strong">Currently</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info label="Company" value={alumni.currentCompany} />
          <Info label="Designation" value={alumni.currentDesignation} />
          <Info label="Location" value={alumni.currentLocation} />
        </dl>
      </Card>

      {alumni.notes && (
        <Card className="space-y-2 p-5">
          <h2 className="text-sm font-semibold text-strong">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-body">{alumni.notes}</p>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-body">{value || '—'}</dd>
    </div>
  );
}

function EditAlumniForm({
  alumni,
  onCancel,
  onSaved,
}: {
  alumni: Alumni;
  onCancel: () => void;
  onSaved: (updated: Alumni) => void;
}) {
  const [form, setForm] = useState({
    fullName: alumni.fullName,
    email: alumni.email,
    graduationYear: String(alumni.graduationYear),
    branch: alumni.branch,
    phone: alumni.phone ?? '',
    course: alumni.course ?? '',
    currentCompany: alumni.currentCompany ?? '',
    currentDesignation: alumni.currentDesignation ?? '',
    currentLocation: alumni.currentLocation ?? '',
    linkedinUrl: alumni.linkedinUrl ?? '',
    tags: alumni.tags.join(', '),
    notes: alumni.notes ?? '',
    isMentor: alumni.isMentor,
    isHiring: alumni.isHiring,
    isActive: alumni.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: Partial<AlumniInput> & { isActive?: boolean } = {
        fullName: form.fullName,
        email: form.email,
        graduationYear: Number(form.graduationYear),
        branch: form.branch,
        phone: form.phone || undefined,
        course: form.course || undefined,
        currentCompany: form.currentCompany || undefined,
        currentDesignation: form.currentDesignation || undefined,
        currentLocation: form.currentLocation || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes: form.notes || undefined,
        isMentor: form.isMentor,
        isHiring: form.isHiring,
        isActive: form.isActive,
      };
      onSaved(await updateAlumni(alumni.id, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-strong">Edit alumnus</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *">
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email *">
          <input className={inputCls} value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Graduation year *">
          <input
            type="number"
            className={inputCls}
            value={form.graduationYear}
            onChange={set('graduationYear')}
          />
        </Field>
        <Field label="Branch *">
          <input className={inputCls} value={form.branch} onChange={set('branch')} />
        </Field>
        <Field label="Course">
          <input className={inputCls} value={form.course} onChange={set('course')} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Current company">
          <input className={inputCls} value={form.currentCompany} onChange={set('currentCompany')} />
        </Field>
        <Field label="Designation">
          <input
            className={inputCls}
            value={form.currentDesignation}
            onChange={set('currentDesignation')}
          />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={form.currentLocation} onChange={set('currentLocation')} />
        </Field>
        <Field label="LinkedIn URL">
          <input className={inputCls} value={form.linkedinUrl} onChange={set('linkedinUrl')} />
        </Field>
        <Field label="Tags (comma-separated)">
          <input className={inputCls} value={form.tags} onChange={set('tags')} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isMentor}
            onChange={(e) => setForm((f) => ({ ...f, isMentor: e.target.checked }))}
          />
          Available as mentor
        </label>
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isHiring}
            onChange={(e) => setForm((f) => ({ ...f, isHiring: e.target.checked }))}
          />
          Currently hiring
        </label>
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Card>
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
