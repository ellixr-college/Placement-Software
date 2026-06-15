'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import {
  addContact,
  getCompany,
  getHiringHistory,
  removeContact,
  type Company,
  type HiringHistoryItem,
} from '../../../../lib/companies';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [history, setHistory] = useState<HiringHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: '', email: '', designation: '', phone: '', isPrimary: false });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, h] = await Promise.all([getCompany(id), getHiringHistory(id)]);
      setCompany(c);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitContact() {
    setBusy(true);
    setError(null);
    try {
      await addContact(id, {
        name: contact.name,
        email: contact.email,
        designation: contact.designation || undefined,
        phone: contact.phone || undefined,
        isPrimary: contact.isPrimary,
      });
      setContact({ name: '', email: '', designation: '', phone: '', isPrimary: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add contact');
    } finally {
      setBusy(false);
    }
  }

  async function deleteContact(contactId: string) {
    setBusy(true);
    try {
      await removeContact(id, contactId);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;
  if (!company) return <p className="text-danger">{error ?? 'Company not found'}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/companies" className="text-sm text-primary-600 hover:underline">← Companies</Link>

      <header>
        <h1 className="text-2xl font-semibold text-strong">{company.name}</h1>
        <p className="text-sm text-subtle">
          {[company.industry, company.city].filter(Boolean).join(' · ') || '—'}
          {company.website && (
            <> · <a href={company.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Website</a></>
          )}
        </p>
        {company.description && <p className="mt-2 text-sm text-body">{company.description}</p>}
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Contacts */}
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-strong">Points of contact</h2>
        {company.contacts.length === 0 && <p className="text-xs text-subtle">No contacts yet.</p>}
        {company.contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium text-strong">
                {c.name} {c.isPrimary && <span className="ml-1 text-xs text-primary-600">(primary)</span>}
              </p>
              <p className="text-xs text-subtle">
                {[c.designation, c.email, c.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button onClick={() => deleteContact(c.id)} disabled={busy} className="text-xs text-danger hover:underline">
              Remove
            </button>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          <input className={inputCls} placeholder="Designation" value={contact.designation} onChange={(e) => setContact({ ...contact, designation: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-subtle">
            <input type="checkbox" checked={contact.isPrimary} onChange={(e) => setContact({ ...contact, isPrimary: e.target.checked })} />
            Primary contact
          </label>
          <Button size="sm" onClick={submitContact} disabled={busy || !contact.name.trim() || !contact.email.trim()}>
            Add contact
          </Button>
        </div>
      </Card>

      {/* Hiring history */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-strong">Hiring history</h2>
        {history.length === 0 ? (
          <p className="text-xs text-subtle">No jobs posted for this company yet.</p>
        ) : (
          history.map((j) => (
            <div key={j.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <Link href={`/jobs/${j.id}`} className="text-sm font-medium text-strong hover:underline">{j.title}</Link>
              <span className="text-xs text-subtle">
                {j.status} · {j.applicationCount} applied · {j.hiredCount} hired
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
