'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import {
  createMyInternship,
  employmentTypeLabel,
  EMPLOYMENT_TYPES,
  listMyInternships,
  updateMyInternship,
  type Internship,
  type InternshipInput,
} from '../../../../lib/internships';
import { isValidPhone, normalizePhoneDigits } from '@ellixr/shared';
import { mutate, useApi } from '../../../../lib/use-api';

const MAX_INTERNSHIPS = 3;
const INTERNSHIPS_KEY = '/student/internships';

export default function MyInternshipsPage() {
  const {
    data: items,
    error,
    isLoading,
  } = useApi<Internship[]>(INTERNSHIPS_KEY, listMyInternships);
  const [editing, setEditing] = useState<Internship | 'new' | null>(null);

  const atLimit = (items?.length ?? 0) >= MAX_INTERNSHIPS;

  if (isLoading || !items) return <ListSkeleton />;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/me/profile" className="text-sm text-primary-600">
            ← Profile
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-strong">My internships</h1>
          <p className="text-sm text-subtle">
            Add internships you found on your own ({items.length}/{MAX_INTERNSHIPS}).
          </p>
        </div>
        {editing === null && !atLimit && <Button onClick={() => setEditing('new')}>Add</Button>}
      </header>

      {editing !== null && (
        <InternshipForm
          internship={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate(INTERNSHIPS_KEY);
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error.message}</p>}

      {items.length === 0 && editing === null ? (
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
                {i.employmentType ? ` · ${employmentTypeLabel(i.employmentType)}` : ''}
                {i.location ? ` · ${i.location}` : ''}
              </p>
            </div>
            {(i.domain || i.skills) && (
              <p className="text-xs text-body">
                {[i.domain, i.skills].filter(Boolean).join(' · ')}
              </p>
            )}
            {i.description && <p className="text-sm text-body">{i.description}</p>}
            {(i.startDate || i.endDate) && (
              <p className="text-xs text-subtle">
                {i.startDate ? fmt(i.startDate) : '—'} → {i.endDate ? fmt(i.endDate) : 'Present'}
              </p>
            )}
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
    employmentType: internship?.employmentType ?? '',
    domain: internship?.domain ?? '',
    skills: internship?.skills ?? '',
    location: internship?.location ?? '',
    isPaid: internship?.isPaid ?? false,
    stipend: internship?.stipend != null ? String(internship.stipend) : '',
    startDate: internship?.startDate ? toDateInput(internship.startDate) : '',
    endDate: internship?.endDate ? toDateInput(internship.endDate) : '',
    isPpo: internship?.isPpo ?? false,
    description: internship?.description ?? '',
    pocName: internship?.pocName ?? '',
    pocEmail: internship?.pocEmail ?? '',
    pocPhone: internship?.pocPhone ?? '',
    certificateUrl: internship?.certificateUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k: 'isPaid' | 'isPpo') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function submit() {
    setSaving(true);
    setFormError(null);
    try {
      const phone = normalizePhoneDigits(form.pocPhone);
      if (!isValidPhone(phone)) {
        throw new Error('Enter a valid 10-digit mobile number');
      }
      const input: InternshipInput = {
        role: form.role.trim(),
        companyName: form.companyName.trim(),
        employmentType: (form.employmentType as InternshipInput['employmentType']) || undefined,
        domain: form.domain.trim() || undefined,
        skills: form.skills.trim() || undefined,
        location: form.location.trim(),
        isPaid: form.isPaid,
        stipend: form.stipend.trim() ? Number(form.stipend) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isPpo: form.isPpo,
        description: form.description.trim() || undefined,
        pocName: form.pocName.trim(),
        pocEmail: form.pocEmail.trim(),
        pocPhone: phone,
        certificateUrl: form.certificateUrl.trim() || undefined,
      };
      if (internship) await updateMyInternship(internship.id, input);
      else await createMyInternship(input);
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save internship');
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
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Employment type">
          <select
            className={inputCls}
            value={form.employmentType}
            onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
          >
            <option value="">Select</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {employmentTypeLabel(t)}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Location *">
          <input
            className={inputCls}
            value={form.location}
            onChange={set('location')}
            placeholder="Bangalore / Remote"
          />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Domain">
          <input
            className={inputCls}
            value={form.domain}
            onChange={set('domain')}
            placeholder="e.g. Data Science"
          />
        </Labeled>
        <Labeled label="Skills / technologies">
          <input
            className={inputCls}
            value={form.skills}
            onChange={set('skills')}
            placeholder="e.g. Python, React"
          />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Start date">
          <input
            type="date"
            className={inputCls}
            value={form.startDate}
            onChange={set('startDate')}
          />
        </Labeled>
        <Labeled label="End date">
          <input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Paid?">
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={form.isPaid} onChange={setBool('isPaid')} />
            This internship is paid
          </label>
        </Labeled>
        <Labeled label="Stipend (₹/month)">
          <input
            type="number"
            className={inputCls}
            value={form.stipend}
            onChange={set('stipend')}
            placeholder="15000"
            disabled={!form.isPaid}
            min="0"
          />
        </Labeled>
      </div>
      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" checked={form.isPpo} onChange={setBool('isPpo')} />
        Converted into a PPO
      </label>
      <Labeled label="Short description">
        <textarea
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="What you worked on…"
        />
      </Labeled>
      <Labeled label="Certificate / offer letter URL">
        <input
          className={inputCls}
          value={form.certificateUrl}
          onChange={set('certificateUrl')}
          placeholder="https://…"
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
                type="tel"
                value={form.pocPhone}
                onChange={set('pocPhone')}
                placeholder="9876543210"
              />
            </Labeled>
          </div>
        </div>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}
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

function fmt(d: string): string {
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
