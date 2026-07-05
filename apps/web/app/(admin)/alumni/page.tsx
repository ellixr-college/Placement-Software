'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, SectionCard, StatTile } from '@ellixr/ui';
import { isValidEmail, isValidPhone, toTitleCase } from '@ellixr/shared';
import { useSession } from '../../../lib/session';
import { CopyButton } from '../../../components/copy-button';
import { BatchCards } from '../../../components/batch-cards';
import {
  approveAlumni,
  createAlumni,
  getAlumniStats,
  listAlumni,
  type Alumni,
  type AlumniFilters,
  type AlumniStats,
} from '../../../lib/alumni';

export default function AlumniPage() {
  const { user } = useSession();
  const [items, setItems] = useState<Alumni[]>([]);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [filters, setFilters] = useState<AlumniFilters>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load(next: AlumniFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAlumni(next);
      setItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alumni');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStats(await getAlumniStats());
    } catch {
      /* stats are best-effort; ignore */
    }
  }

  useEffect(() => {
    load();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(patch: Partial<AlumniFilters>) {
    const next = { ...filters, ...patch };
    // Drop empty values so they don't hit the query string.
    (Object.keys(next) as (keyof AlumniFilters)[]).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === '' || v === null) delete next[k];
    });
    setFilters(next);
    load(next);
  }

  function toggle<K extends keyof AlumniFilters>(key: K, value: AlumniFilters[K]) {
    apply({ [key]: filters[key] === value ? undefined : value } as Partial<AlumniFilters>);
  }

  const hasFilters = Object.keys(filters).some((k) => k !== 'page' && k !== 'limit');

  async function approve(a: Alumni) {
    try {
      await approveAlumni(a.id);
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve');
    }
  }

  const slug = user?.college?.slug;
  const registerUrl =
    slug && typeof window !== 'undefined' ? `${window.location.origin}/alumni-register/${slug}` : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Alumni</h1>
          <p className="text-sm text-subtle">
            {stats ? `${stats.total} graduates` : `${items.length} graduates`}
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add alumnus'}</Button>
      </header>

      {/* Stat strip */}
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile gradient="ocean" value={stats.total} label="Total alumni" />
          <StatTile gradient="violet" value={stats.mentors} label="Mentors" />
          <StatTile gradient="sunset" value={stats.hiring} label="Hiring now" />
        </div>
      )}

      {/* Batches — tap a card to filter the directory to that passout year */}
      {stats && stats.byGraduationYear.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-subtle">Batches</p>
            {filters.graduationYear != null && (
              <button
                onClick={() => apply({ graduationYear: undefined })}
                className="text-xs text-primary-600 hover:underline"
              >
                Clear batch ({filters.graduationYear})
              </button>
            )}
          </div>
          <BatchCards
            items={[...stats.byGraduationYear]
              .sort((a, b) => b.graduationYear - a.graduationYear)
              .map((y) => ({
                key: String(y.graduationYear),
                title: String(y.graduationYear),
                stats: [{ label: y.count === 1 ? 'alumnus' : 'alumni', value: y.count }],
              }))}
            onSelect={(k) => apply({ graduationYear: Number(k) })}
          />
        </div>
      )}

      {/* Self-registration link to share with graduating batches */}
      {registerUrl && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-strong">Alumni self-registration link</p>
            <p className="text-xs text-subtle">{registerUrl}</p>
          </div>
          <CopyButton value={registerUrl} />
        </Card>
      )}

      {showForm && (
        <NewAlumniForm
          onCreated={() => {
            setShowForm(false);
            load();
            loadStats();
          }}
        />
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply({ search: search || undefined })}
          placeholder="Search by name, email or company…"
          className="h-10 w-full max-w-md rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
        />
        <Button variant="ghost" onClick={() => apply({ search: search || undefined })}>
          Search
        </Button>
      </div>

      {/* Segmentation filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={filters.isMentor === true} onClick={() => toggle('isMentor', true)}>
            Mentors
          </Chip>
          <Chip active={filters.isHiring === true} onClick={() => toggle('isHiring', true)}>
            Hiring
          </Chip>
          <Chip active={filters.pending === true} onClick={() => toggle('pending', true)}>
            Pending approval
          </Chip>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilters({});
                load({});
              }}
              className="text-xs text-primary-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {stats && stats.facets.branches.length > 0 && (
          <FacetRow label="Branch">
            {stats.facets.branches.map((b) => (
              <Chip key={b} active={filters.branch === b} onClick={() => toggle('branch', b)}>
                {b}
              </Chip>
            ))}
          </FacetRow>
        )}

      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Directory */}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Now at</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-subtle">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-subtle">
                  No alumni match these filters.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/alumni/${a.id}`}
                      className="font-medium text-strong hover:underline"
                    >
                      {a.fullName}
                    </Link>
                    {!a.isActive && <span className="ml-2 text-xs text-subtle">(inactive)</span>}
                    <p className="text-xs text-subtle">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">{a.graduationYear}</td>
                  <td className="px-4 py-3">{a.branch}</td>
                  <td className="px-4 py-3">
                    {a.currentCompany ? (
                      <>
                        <span className="text-strong">{a.currentCompany}</span>
                        {a.currentDesignation && (
                          <p className="text-xs text-subtle">{a.currentDesignation}</p>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {!a.isApproved && (
                        <>
                          <Badge tint="cream">Pending</Badge>
                          <button
                            onClick={() => approve(a)}
                            className="rounded-pill bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      {a.isMentor && <Badge tint="lavender">Mentor</Badge>}
                      {a.isHiring && <Badge tint="mint">Hiring</Badge>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Segmentation breakdowns */}
      {stats && (stats.byBranch.length > 0 || stats.topCompanies.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownCard
            title="By branch"
            rows={stats.byBranch.map((b) => ({ label: b.branch, count: b.count }))}
            onPick={(label) => toggle('branch', label)}
          />
          <BreakdownCard
            title="Top employers"
            rows={stats.topCompanies.map((c) => ({ label: c.company, count: c.count }))}
            onPick={(label) => apply({ company: label })}
          />
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-pill px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-primary-500 text-white'
          : 'border border-border bg-white text-subtle hover:border-primary-400'
      }`}
    >
      {children}
    </button>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase text-subtle">{label}</span>
      {children}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  onPick,
}: {
  title: string;
  rows: { label: string; count: number }[];
  onPick: (label: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-xs text-subtle">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <button key={r.label} onClick={() => onPick(r.label)} className="block w-full text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-body hover:text-primary-600">{r.label}</span>
                <span className="text-subtle">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-muted">
                <div
                  className="h-full rounded-pill bg-gradient-primary"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function NewAlumniForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    graduationYear: String(new Date().getFullYear()),
    branch: '',
    phone: '',
    registerNumber: '',
    course: '',
    currentCompany: '',
    currentDesignation: '',
    currentLocation: '',
    linkedinUrl: '',
    tags: '',
    notes: '',
    isMentor: false,
    isHiring: false,
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
      await createAlumni({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        graduationYear: Number(form.graduationYear),
        branch: form.branch.trim(),
        phone: form.phone.trim() || undefined,
        registerNumber: form.registerNumber.trim() || undefined,
        course: form.course || undefined,
        currentCompany: form.currentCompany || undefined,
        currentDesignation: form.currentDesignation || undefined,
        currentLocation: form.currentLocation.trim() ? toTitleCase(form.currentLocation) : undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        notes: form.notes || undefined,
        isMentor: form.isMentor,
        isHiring: form.isHiring,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add alumnus');
    } finally {
      setSaving(false);
    }
  }

  const emailOk = !form.email.trim() || isValidEmail(form.email);
  const phoneOk = !form.phone.trim() || isValidPhone(form.phone);
  const ready =
    form.fullName.trim() &&
    form.email.trim() &&
    isValidEmail(form.email) &&
    form.branch.trim() &&
    form.graduationYear &&
    phoneOk;

  return (
    <Card className="space-y-3 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *">
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email *">
          <input className={inputCls} value={form.email} onChange={set('email')} />
          {!emailOk && <span className="text-xs text-danger">Enter a valid email address.</span>}
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
        <Field label="Register number">
          <input className={inputCls} value={form.registerNumber} onChange={set('registerNumber')} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
          {!phoneOk && <span className="text-xs text-danger">Enter a valid 10-digit mobile number.</span>}
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
          <input
            className={inputCls}
            value={form.linkedinUrl}
            onChange={set('linkedinUrl')}
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input className={inputCls} value={form.tags} onChange={set('tags')} placeholder="ml, founder" />
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
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={saving} disabled={!ready}>
        {saving ? 'Saving…' : 'Add alumnus'}
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
