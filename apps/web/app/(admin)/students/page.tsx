'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../components/confirm-provider';
import {
  deleteStudents,
  listStudents,
  setStudentActive,
  type ListMeta,
  type Student,
} from '../../../lib/students';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  REGISTERED: 'cream',
  VERIFIED: 'mint',
  PLACED: 'lavender',
  NOT_PLACED: 'primary',
};

export default function StudentsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Student[]>([]);
  const [meta, setMeta] = useState<ListMeta | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({ search: search || undefined, page, limit: 10 });
      setItems(res.items);
      setMeta(res.meta);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(s: Student) {
    setBusyId(s.id);
    setError(null);
    try {
      await setStudentActive(s.id, !s.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((s) => s.id)),
    );
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} student${selected.size === 1 ? '' : 's'}?`,
      message: 'This permanently removes the selected students and their logins. This cannot be undone.',
      confirmLabel: `Delete ${selected.size}`,
      destructive: true,
      acknowledgement: 'I understand this is permanent.',
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStudents([...selected]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Students</h1>
          <p className="text-sm text-subtle">
            {meta ? `${meta.total} registered` : 'Manage your student registry'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/students/import">
            <Button variant="ghost">Import CSV</Button>
          </Link>
          <Link href="/students/new">
            <Button>Add student</Button>
          </Link>
        </div>
      </header>

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by name, email, or roll number…"
          className="h-10 w-full max-w-md rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-primary-200 bg-primary-50 px-4 py-2">
          <span className="text-sm font-medium text-primary-700">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs text-subtle hover:underline">
              Clear
            </button>
            <Button variant="danger" size="sm" onClick={deleteSelected} loading={deleting}>
              {deleting ? 'Deleting…' : 'Delete selected'}
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                  className="h-4 w-4 cursor-pointer accent-primary-600"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Reg No.</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Passout</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-subtle">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-subtle">
                  No students yet. Add one or import a CSV to activate student logins.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-border last:border-0 hover:bg-app/60 ${
                    selected.has(s.id) ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      aria-label={`Select ${s.user.fullName}`}
                      className="h-4 w-4 cursor-pointer accent-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="font-medium text-strong hover:underline">
                      {s.user.fullName}
                    </Link>
                    <p className="text-xs text-subtle">{s.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-strong">{s.rollNumber}</td>
                  <td className="px-4 py-3">{s.course || '—'}</td>
                  <td className="px-4 py-3">{s.branch || '—'}</td>
                  <td className="px-4 py-3">
                    {s.graduationYear}
                    {s.currentYear ? <span className="text-xs text-subtle"> · Yr {s.currentYear}</span> : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tint={STATUS_TINT[s.status] ?? 'primary'}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <span className="text-xs text-success">Active</span>
                    ) : (
                      <span className="text-xs text-subtle">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={busyId === s.id}
                        className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                      >
                        {s.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <Link
                        href={`/students/${s.id}`}
                        className="text-xs font-medium text-subtle hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-subtle">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} students · page{' '}
            {meta.page} of {meta.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
