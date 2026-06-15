'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { createCompany, listCompanies, type Company } from '../../../lib/companies';

export default function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listCompanies(search));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Companies</h1>
          <p className="text-sm text-subtle">{items.length} recruiters</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add company'}</Button>
      </header>

      {showForm && <NewCompanyForm onCreated={() => { setShowForm(false); load(); }} />}

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name or industry…"
          className="h-10 w-full max-w-md rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
        />
        <Button variant="ghost" onClick={load}>Search</Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">POCs</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">No companies yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="font-medium text-strong hover:underline">
                      {c.name}
                    </Link>
                    {!c.isActive && <span className="ml-2 text-xs text-subtle">(inactive)</span>}
                  </td>
                  <td className="px-4 py-3">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3">{c.city ?? '—'}</td>
                  <td className="px-4 py-3">{c.contacts?.length ?? 0}</td>
                  <td className="px-4 py-3">{c._count?.jobs ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewCompanyForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', industry: '', city: '', website: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createCompany({
        name: form.name,
        industry: form.industry || undefined,
        city: form.city || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name *"><input className={inputCls} value={form.name} onChange={set('name')} /></Field>
        <Field label="Industry"><input className={inputCls} value={form.industry} onChange={set('industry')} /></Field>
        <Field label="City"><input className={inputCls} value={form.city} onChange={set('city')} /></Field>
        <Field label="Website"><input className={inputCls} value={form.website} onChange={set('website')} placeholder="https://…" /></Field>
      </div>
      <Field label="Description">
        <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} disabled={saving || !form.name.trim()}>
        {saving ? 'Saving…' : 'Create company'}
      </Button>
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
