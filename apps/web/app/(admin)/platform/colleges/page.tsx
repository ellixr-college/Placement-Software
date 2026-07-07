'use client';

import { Fragment, useEffect, useState } from 'react';
import { Badge, Button, Card } from '@ellixr/ui';
import { isValidEmail, isValidPhone, toTitleCase } from '@ellixr/shared';
import { PasswordInput } from '../../../../components/password-input';
import { CopyButton } from '../../../../components/copy-button';
import { CoursesPanel } from '../../../../components/courses-panel';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  createCollege,
  listColleges,
  resetCollegeAdminPassword,
  setCollegeStatus,
  type College,
  type CreateCollegeResult,
  type ResetAdminPasswordResult,
} from '../../../../lib/colleges';

export default function PlatformCollegesPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<College[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateCollegeResult | null>(null);
  const [reset, setReset] = useState<ResetAdminPasswordResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coursesFor, setCoursesFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listColleges(search));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(c: College) {
    try {
      await setCollegeStatus(c.id, !c.isActive);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    }
  }

  async function resetPassword(c: College) {
    const ok = await confirm({
      title: `Reset password for ${c.name}?`,
      message:
        "The super-admin's current password stops working immediately, and they'll set a new one on next login.",
      acknowledgement: 'I understand this revokes their current password.',
      confirmLabel: 'Reset password',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(c.id);
    setError(null);
    setCreated(null);
    try {
      setReset(await resetCollegeAdminPassword(c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Colleges</h1>
          <p className="text-sm text-subtle">
            {items.length} tenant{items.length === 1 ? '' : 's'} · each isolated by collegeId
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((s) => !s);
            setCreated(null);
          }}
        >
          {showForm ? 'Cancel' : 'Add college'}
        </Button>
      </header>

      {/* One-time super-admin credentials, shown right after creation */}
      {created && (
        <Card className="space-y-2 border border-success/30 bg-success/5 p-5">
          <p className="text-sm font-semibold text-strong">
            College “{created.college.name}” created
          </p>
          <p className="text-sm text-body">
            {created.passwordGenerated
              ? "Super-admin (College Admin) login — share these once, they won't be shown again:"
              : 'Super-admin (College Admin) created with the password you set.'}
          </p>
          <div className="rounded-md bg-white p-3 text-sm">
            <p>
              <span className="text-subtle">Email:</span>{' '}
              <span className="font-medium text-strong">{created.college.contactEmail}</span>
            </p>
            {created.passwordGenerated && created.adminTempPassword && (
              <p className="mt-1 flex items-center gap-2">
                <span className="text-subtle">Temp password:</span>
                <code className="rounded bg-app px-1.5 py-0.5 font-mono text-strong">
                  {created.adminTempPassword}
                </code>
                <CopyButton value={created.adminTempPassword} className="px-2 py-1" />
              </p>
            )}
          </div>
          <p className="text-xs text-subtle">
            They'll be prompted to set a new password on first login. The College Admin manages
            their own officers, students, companies, jobs and alumni from here on.
          </p>
        </Card>
      )}

      {/* One-time reveal after a password reset */}
      {reset && (
        <Card className="space-y-2 border border-primary-200 bg-primary-50/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-semibold text-strong">New password for {reset.adminEmail}</p>
            <button
              onClick={() => setReset(null)}
              className="text-xs text-subtle hover:text-strong"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm text-body">
            Share it once — it isn&apos;t stored and won&apos;t be shown again. They&apos;ll be
            prompted to set their own on next login.
          </p>
          {reset.tempPassword && (
            <div className="flex max-w-sm items-center gap-2">
              <PasswordInput
                readOnly
                value={reset.tempPassword}
                onChange={() => {}}
                className="h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm text-strong outline-none"
              />
              <CopyButton value={reset.tempPassword} />
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <NewCollegeForm
          onCreated={(result) => {
            setShowForm(false);
            setCreated(result);
            load();
          }}
        />
      )}

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name…"
          className="h-10 w-full max-w-md rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
        />
        <Button variant="ghost" onClick={load}>
          Search
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">College</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
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
                  No colleges yet. Add your first tenant.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-app/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-strong">{c.name}</p>
                      <p className="text-xs text-subtle">
                        {c.slug} · {c.contactEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tint="cream">{c.subscriptionPlan}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? (
                        <span className="rounded-pill bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-pill bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setCoursesFor((id) => (id === c.id ? null : c.id))}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          {coursesFor === c.id ? 'Hide courses' : 'Courses'}
                        </button>
                        <button
                          onClick={() => resetPassword(c)}
                          disabled={busyId === c.id}
                          className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                        >
                          {busyId === c.id ? 'Resetting…' : 'Reset password'}
                        </button>
                        <button
                          onClick={() => toggleStatus(c)}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          {c.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {coursesFor === c.id && (
                    <tr className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3">
                        <CoursesPanel collegeId={c.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function NewCollegeForm({ onCreated }: { onCreated: (result: CreateCollegeResult) => void }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    city: '',
    state: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local course catalog defined during onboarding.
  const [courses, setCourses] = useState<{ name: string; branches: string[] }[]>([]);
  const [courseName, setCourseName] = useState('');
  const [courseBranches, setCourseBranches] = useState('');

  function addCourse() {
    const name = courseName.trim();
    if (!name || courses.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const branches = [
      ...new Set(
        courseBranches
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      ),
    ];
    setCourses((cs) => [...cs, { name, branches }]);
    setCourseName('');
    setCourseBranches('');
  }

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-derive slug from name until the user edits the slug themselves.
      if (k === 'name' && !slugTouched) next.slug = slugify(v);
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const result = await createCollege({
        name: form.name.trim(),
        slug: form.slug,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        // City/State stored proper-cased ("bengaluru" → "Bengaluru").
        city: form.city.trim() ? toTitleCase(form.city) : undefined,
        state: form.state.trim() ? toTitleCase(form.state) : undefined,
        adminFullName: form.adminFullName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword.trim() || undefined,
        courses: courses.length ? courses : undefined,
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create college');
    } finally {
      setSaving(false);
    }
  }

  const passwordOk = form.adminPassword.trim() === '' || form.adminPassword.trim().length >= 8;
  const contactEmailOk = !form.contactEmail.trim() || isValidEmail(form.contactEmail);
  const adminEmailOk = !form.adminEmail.trim() || isValidEmail(form.adminEmail);
  const phoneOk = !form.contactPhone.trim() || isValidPhone(form.contactPhone);
  const ready =
    form.name.trim() &&
    form.slug.trim() &&
    form.contactEmail.trim() &&
    isValidEmail(form.contactEmail) &&
    form.adminFullName.trim() &&
    form.adminEmail.trim() &&
    isValidEmail(form.adminEmail) &&
    phoneOk &&
    passwordOk;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-strong">College details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </Field>
          <Field label="Slug *">
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setField('slug', slugify(e.target.value));
              }}
              placeholder="lowercase-hyphenated"
            />
          </Field>
          <Field label="Contact email *">
            <input
              className={inputCls}
              value={form.contactEmail}
              onChange={(e) => setField('contactEmail', e.target.value)}
            />
            {!contactEmailOk && <FieldError>Enter a valid email address.</FieldError>}
          </Field>
          <Field label="Contact phone">
            <input
              className={inputCls}
              value={form.contactPhone}
              onChange={(e) => setField('contactPhone', e.target.value)}
              placeholder="10-digit mobile"
            />
            {!phoneOk && <FieldError>Enter a valid 10-digit mobile number.</FieldError>}
          </Field>
          <Field label="City">
            <input
              className={inputCls}
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
            />
          </Field>
          <Field label="State">
            <input
              className={inputCls}
              value={form.state}
              onChange={(e) => setField('state', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-strong">Super-admin (College Admin)</h2>
        <p className="text-xs text-subtle">
          One admin account is created for this college. They manage everything inside it.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name *">
            <input
              className={inputCls}
              value={form.adminFullName}
              onChange={(e) => setField('adminFullName', e.target.value)}
            />
          </Field>
          <Field label="Admin email *">
            <input
              className={inputCls}
              value={form.adminEmail}
              onChange={(e) => setField('adminEmail', e.target.value)}
            />
            {!adminEmailOk && <FieldError>Enter a valid email address.</FieldError>}
          </Field>
          <Field label="Password">
            <PasswordInput
              className={inputCls}
              value={form.adminPassword}
              onChange={(e) => setField('adminPassword', e.target.value)}
              placeholder="Leave blank to auto-generate"
              autoComplete="new-password"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-subtle">
          Set a password (min 8 characters) to share with the admin directly, or leave it blank and
          we'll generate a one-time temp password for you.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-strong">Courses offered</h2>
        <p className="text-xs text-subtle">
          The courses + branches this college runs. Students and jobs pick from these. You can edit
          them later from the Courses action.
        </p>
        {courses.length > 0 && (
          <div className="mt-3 space-y-1">
            {courses.map((co, i) => (
              <div
                key={co.name}
                className="flex items-center gap-2 rounded-md bg-app px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-strong">{co.name}</span>
                <span className="flex-1 text-xs text-subtle">
                  {co.branches.length ? co.branches.join(' · ') : 'no branches'}
                </span>
                <button
                  type="button"
                  onClick={() => setCourses((cs) => cs.filter((_, j) => j !== i))}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Course">
            <input
              className={`${inputCls} w-40`}
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCourse())}
              placeholder="B.Tech"
            />
          </Field>
          <Field label="Branches (comma-separated)">
            <input
              className={`${inputCls} w-72`}
              value={courseBranches}
              onChange={(e) => setCourseBranches(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCourse())}
              placeholder="CSE, ECE, Mechanical (blank if none)"
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCourse}
            disabled={!courseName.trim()}
          >
            Add course
          </Button>
        </div>
      </div>

      {!passwordOk && (
        <p className="text-sm text-danger">Password must be at least 8 characters.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={saving} disabled={!ready}>
        {saving ? 'Creating…' : 'Create college + admin'}
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-danger">{children}</span>;
}
