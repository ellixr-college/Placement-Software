'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@ellixr/ui';
import { listStudents, type ListMeta, type Student } from '../../../lib/students';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  REGISTERED: 'cream',
  VERIFIED: 'mint',
  PLACED: 'lavender',
  NOT_PLACED: 'primary',
};

export default function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [meta, setMeta] = useState<ListMeta | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({ search: search || undefined, page, limit: 25 });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

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

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Roll No.</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Grad year</th>
              <th className="px-4 py-3 font-medium">CGPA</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Login</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-subtle">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-subtle">
                  No students yet. Add one or import a CSV to activate student logins.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="font-medium text-strong hover:underline">
                      {s.user.fullName}
                    </Link>
                    <p className="text-xs text-subtle">{s.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-strong">{s.rollNumber}</td>
                  <td className="px-4 py-3">{s.branch}</td>
                  <td className="px-4 py-3">{s.graduationYear}</td>
                  <td className="px-4 py-3">{s.cgpa ?? '—'}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-subtle">
            Page {meta.page} of {meta.pages}
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
