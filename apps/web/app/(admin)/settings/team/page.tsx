'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, SectionCard } from '@ellixr/ui';
import { isValidEmail, isValidPhone } from '@ellixr/shared';
import { useSession } from '../../../../lib/session';
import {
  createUser,
  deactivateUser,
  listUsers,
  reactivateUser,
  updateUser,
  type CreateUserResult,
  type TeamMember,
} from '../../../../lib/users';

const ROLE_LABEL: Record<string, string> = {
  COLLEGE_ADMIN: 'College Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
};

export default function TeamSettingsPage() {
  const { user, loading } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setMembers(await listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
  }

  useEffect(() => {
    if (loading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function onDeactivate(m: TeamMember) {
    if (!confirm(`Deactivate ${m.fullName}? They will be signed out and unable to log in.`)) return;
    await run(m.id, () => deactivateUser(m.id), 'Could not deactivate');
  }

  async function onReactivate(m: TeamMember) {
    await run(m.id, () => reactivateUser(m.id), 'Could not reactivate');
  }

  async function onChangeRole(m: TeamMember, role: string) {
    if (role === m.role) return;
    await run(m.id, () => updateUser(m.id, { role }), 'Could not change role');
  }

  async function run(id: string, fn: () => Promise<unknown>, fallback: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  const active = members.filter((m) => m.isActive);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Team</h1>
          <p className="text-sm text-subtle">
            {active.length} member{active.length === 1 ? '' : 's'} · Placement Officers & Administrators
          </p>
        </div>
        <Button onClick={() => { setShowForm((s) => !s); setCreated(null); }} variant={showForm ? 'outline' : 'primary'}>
          {showForm ? 'Cancel' : 'Add member'}
        </Button>
      </header>

      {/* One-time credentials shown right after creation */}
      {created && (
        <Card className="space-y-2 border border-success/30 bg-success/5 p-5">
          <p className="text-sm font-semibold text-strong">
            {ROLE_LABEL[created.user.role] ?? created.user.role} “{created.user.fullName}” added
          </p>
          <p className="text-sm text-body">
            {created.passwordGenerated
              ? "Share these credentials once — the temp password won't be shown again:"
              : 'Created with the password you set. Share the login below.'}
          </p>
          <div className="rounded-md bg-white p-3 text-sm">
            <p>
              <span className="text-subtle">Email:</span>{' '}
              <span className="font-medium text-strong">{created.user.email}</span>
            </p>
            {created.passwordGenerated && created.tempPassword && (
              <p className="mt-1">
                <span className="text-subtle">Temp password:</span>{' '}
                <code className="rounded bg-app px-1.5 py-0.5 font-mono text-strong">
                  {created.tempPassword}
                </code>
              </p>
            )}
          </div>
          <p className="text-xs text-subtle">They'll be prompted to set a new password on first login.</p>
        </Card>
      )}

      {showForm && (
        <NewMemberForm
          onCreated={(result) => {
            setShowForm(false);
            setCreated(result);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <SectionCard flush>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app/60 text-xs uppercase text-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Last login</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-subtle">No team members yet. Add your first.</td></tr>
            ) : (
              members.map((m) => {
                const isSelf = m.id === user?.id;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-app/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-strong">{m.fullName}{isSelf && <span className="ml-1.5 text-xs text-subtle">(you)</span>}</p>
                      <p className="text-xs text-subtle">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      {isSelf || !m.isActive ? (
                        <Badge tint={m.role === 'COLLEGE_ADMIN' ? 'lavender' : 'cream'}>
                          {ROLE_LABEL[m.role] ?? m.role}
                        </Badge>
                      ) : (
                        <select
                          value={m.role}
                          disabled={busyId === m.id}
                          onChange={(e) => onChangeRole(m, e.target.value)}
                          className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-strong outline-none focus:border-primary-400 disabled:opacity-50"
                        >
                          <option value="PLACEMENT_OFFICER">Placement Officer</option>
                          <option value="COLLEGE_ADMIN">College Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3 text-subtle">
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      {m.isActive ? (
                        <span className="rounded-pill bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Active</span>
                      ) : (
                        <span className="rounded-pill bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isSelf ? null : m.isActive ? (
                        <button
                          onClick={() => onDeactivate(m)}
                          disabled={busyId === m.id}
                          className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                        >
                          {busyId === m.id ? 'Removing…' : 'Deactivate'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onReactivate(m)}
                          disabled={busyId === m.id}
                          className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                        >
                          {busyId === m.id ? 'Restoring…' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function NewMemberForm({ onCreated }: { onCreated: (r: CreateUserResult) => void }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'PLACEMENT_OFFICER',
    phone: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(null);
    await createUser({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      phone: form.phone.trim() || undefined,
      password: form.password.trim() || undefined,
    })
      .then(onCreated)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not add member'));
  }

  const emailOk = !form.email.trim() || isValidEmail(form.email);
  const phoneOk = !form.phone.trim() || isValidPhone(form.phone);
  const passwordOk = form.password.trim() === '' || form.password.trim().length >= 8;
  const ready =
    form.fullName.trim() && form.email.trim() && isValidEmail(form.email) && phoneOk && passwordOk;

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-semibold text-strong">Add a team member</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *">
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email *">
          <input className={inputCls} value={form.email} onChange={set('email')} />
          {!emailOk && <FieldError>Enter a valid email address.</FieldError>}
        </Field>
        <Field label="Role *">
          <select className={inputCls} value={form.role} onChange={set('role')}>
            <option value="PLACEMENT_OFFICER">Placement Officer</option>
            <option value="COLLEGE_ADMIN">College Admin</option>
          </select>
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
          {!phoneOk && <FieldError>Enter a valid 10-digit mobile number.</FieldError>}
        </Field>
        <Field label="Password">
          <input
            className={inputCls}
            type="text"
            value={form.password}
            onChange={set('password')}
            placeholder="Leave blank to auto-generate"
            autoComplete="new-password"
          />
          {!passwordOk && <FieldError>Password must be at least 8 characters.</FieldError>}
        </Field>
      </div>
      <p className="text-xs text-subtle">
        Placement Officers manage students, companies, jobs and the ATS pipeline. College Admins can
        additionally manage the team. Set a password to share directly, or leave blank for a one-time
        temp password.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} disabled={!ready}>Add member</Button>
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
