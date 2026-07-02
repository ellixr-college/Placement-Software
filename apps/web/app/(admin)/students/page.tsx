'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card } from '@ellixr/ui';
import { useConfirm } from '../../../components/confirm-provider';
import {
  deleteStudents,
  graduateBatch,
  listStudents,
  setStudentActive,
  type GraduateResult,
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
  return (
    <Suspense fallback={<p className="text-subtle">Loading…</p>}>
      <StudentsList />
    </Suspense>
  );
}

function StudentsList() {
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const importedCount = searchParams.get('imported');
  const [showImported, setShowImported] = useState(false);
  const [showGraduate, setShowGraduate] = useState(false);
  const [items, setItems] = useState<Student[]>([]);
  const [meta, setMeta] = useState<ListMeta | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Show the "N students added" modal once after an import redirect.
  useEffect(() => {
    if (importedCount) setShowImported(true);
  }, [importedCount]);

  function dismissImported() {
    setShowImported(false);
    router.replace('/students');
  }

  async function toggleActive(s: Student) {
    setError(null);
    try {
      await setStudentActive(s.id, !s.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
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

  async function removeOne(s: Student) {
    const ok = await confirm({
      title: `Delete ${s.user.fullName}?`,
      message: 'This permanently removes the student and their login. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      acknowledgement: 'I understand this is permanent.',
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteStudents([s.id]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
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
      {showImported && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-sm space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-semibold text-strong">
                {importedCount} student{importedCount === '1' ? '' : 's'} added
              </h2>
              <p className="mt-1 text-sm text-subtle">
                They can sign in with their email and the password{' '}
                <span className="font-mono">password123</span>.
              </p>
            </div>
            <Button className="w-full" onClick={dismissImported}>
              Done
            </Button>
          </Card>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Students</h1>
          <p className="text-sm text-subtle">
            {meta
              ? `${meta.total} registered${
                  meta.resumesComplete != null
                    ? ` · ${meta.resumesComplete} resume${meta.resumesComplete === 1 ? '' : 's'} complete`
                    : ''
                }`
              : 'Manage your student registry'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowGraduate(true)}>
            Graduate batch
          </Button>
          <Link href="/students/import">
            <Button variant="ghost">Import CSV</Button>
          </Link>
          <Link href="/students/new">
            <Button>Add student</Button>
          </Link>
        </div>
      </header>

      {showGraduate && (
        <GraduateBatchModal
          onClose={() => setShowGraduate(false)}
          onDone={() => {
            setShowGraduate(false);
            load();
          }}
        />
      )}

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
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Passout</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Resume</th>
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
                  <td className="px-4 py-3">{s.branch || '—'}</td>
                  <td className="px-4 py-3">
                    {s.graduationYear}
                    {s.currentYear ? <span className="text-xs text-subtle"> · Yr {s.currentYear}</span> : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tint={STATUS_TINT[s.status] ?? 'primary'}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {s.resumeComplete ? (
                      <Badge tint="mint">Complete</Badge>
                    ) : (
                      <ResumeIncomplete
                        missing={s.resumeMissing?.length ? s.resumeMissing : ['Resume not started']}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <span className="text-xs text-success">Active</span>
                    ) : (
                      <span className="text-xs text-subtle">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <RowMenu
                        student={s}
                        onToggle={() => toggleActive(s)}
                        onDelete={() => removeOne(s)}
                      />
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

/** Graduate a batch → copy to Alumni + disable their logins. */
function GraduateBatchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GraduateResult | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await graduateBatch(Number(year)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not graduate the batch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md space-y-4 p-6">
        {result ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-strong">Batch {result.graduationYear} graduated</h2>
              <p className="mt-1 text-sm text-subtle">
                {result.alumniCreated} added to Alumni
                {result.alreadyAlumni > 0 ? ` (${result.alreadyAlumni} already there)` : ''} ·{' '}
                {result.studentsGraduated} logins disabled.
              </p>
            </div>
            <Button className="w-full" onClick={onDone}>Done</Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-strong">Graduate a batch</h2>
              <p className="mt-1 text-sm text-subtle">
                Copies every student of this passout year into the Alumni directory and disables
                their student logins. Their records are kept.
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-subtle">Passout year</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-body">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
              I understand the {year} students&apos; logins will be disabled.
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={run} loading={busy} disabled={!ack || !year}>
                {busy ? 'Graduating…' : 'Graduate batch'}
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** "Incomplete" resume badge with a hover tooltip listing what's still missing.
 * The tooltip is fixed-positioned so the table card's overflow doesn't clip it. */
function ResumeIncomplete({ missing }: { missing: string[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left });
  }

  return (
    <span
      ref={ref}
      className="inline-block"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      <Badge tint="cream" className="cursor-help">
        Incomplete
      </Badge>
      {pos && missing.length > 0 && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-56 rounded-md border border-border bg-white p-3 text-left shadow-card"
        >
          <p className="mb-1 text-xs font-semibold text-strong">Still needed</p>
          <ul className="space-y-0.5">
            {missing.map((m) => (
              <li key={m} className="flex items-start gap-1.5 text-xs text-body">
                <span className="text-danger">•</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

/**
 * Per-row "⋮" actions menu. The dropdown is fixed-positioned (computed from the
 * button) so it isn't clipped by the table card's `overflow-hidden`.
 */
function RowMenu({
  student,
  onToggle,
  onDelete,
}: {
  student: Student;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.right - 160 });
    setOpen((o) => !o);
  }

  const item = 'block w-full px-3 py-2 text-left text-xs hover:bg-app';

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Row actions"
        aria-haspopup="menu"
        className="rounded-md p-1.5 text-subtle transition hover:bg-app hover:text-strong"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-40 overflow-hidden rounded-md border border-border bg-white py-1 shadow-card"
        >
          <Link href={`/students/${student.id}`} className={`${item} text-body`} role="menuitem">
            Edit
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
            className={`${item} text-body`}
            role="menuitem"
          >
            {student.isActive ? 'Disable login' : 'Enable login'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={`${item} text-danger`}
            role="menuitem"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
