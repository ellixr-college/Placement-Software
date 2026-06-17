'use client';

import { useEffect, useState } from 'react';
import { Button } from '@ellixr/ui';
import {
  createCollegeCourse,
  deleteCollegeCourse,
  listCollegeCourses,
  updateCollegeCourse,
  type CollegeCourse,
} from '../lib/courses';

const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const inputCls =
  'h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

/** Platform Admin: manage a single college's course catalog (API-backed). */
export function CoursesPanel({ collegeId }: { collegeId: string }) {
  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [name, setName] = useState('');
  const [branches, setBranches] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setCourses(await listCollegeCourses(collegeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCollegeCourse(collegeId, { name: name.trim(), branches: parseList(branches) });
      setName('');
      setBranches('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add course');
    } finally {
      setBusy(false);
    }
  }

  async function saveBranches(id: string, value: string) {
    setError(null);
    try {
      await updateCollegeCourse(collegeId, id, { branches: parseList(value) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteCollegeCourse(collegeId, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-app/40 p-4">
      <p className="text-sm font-semibold text-strong">Course catalog</p>
      {error && <p className="text-xs text-danger">{error}</p>}

      {courses.length === 0 ? (
        <p className="text-xs text-subtle">No courses yet. Add the college's courses below.</p>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <CourseRow key={c.id} course={c} onSave={saveBranches} onRemove={remove} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">Course</span>
          <input className={`${inputCls} w-40`} value={name} onChange={(e) => setName(e.target.value)} placeholder="B.Tech" />
        </label>
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium text-subtle">Branches (comma-separated)</span>
          <input className={inputCls} value={branches} onChange={(e) => setBranches(e.target.value)} placeholder="CSE, ECE, Mechanical (leave blank if none)" />
        </label>
        <Button size="sm" onClick={add} loading={busy} disabled={!name.trim()}>Add course</Button>
      </div>
    </div>
  );
}

function CourseRow({
  course,
  onSave,
  onRemove,
}: {
  course: CollegeCourse;
  onSave: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(course.branches.join(', '));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
      <span className="font-medium text-strong">{course.name}</span>
      {!editing ? (
        <>
          <span className="flex-1 text-xs text-subtle">
            {course.branches.length ? course.branches.join(' · ') : 'no branches'}
          </span>
          <button onClick={() => { setValue(course.branches.join(', ')); setEditing(true); }} className="text-xs font-medium text-primary-600 hover:underline">
            Edit branches
          </button>
          <button onClick={() => onRemove(course.id)} className="text-xs font-medium text-danger hover:underline">
            Remove
          </button>
        </>
      ) : (
        <>
          <input className={`${inputCls} flex-1`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="CSE, ECE…" />
          <button onClick={() => { onSave(course.id, value); setEditing(false); }} className="text-xs font-medium text-primary-600 hover:underline">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-subtle hover:underline">Cancel</button>
        </>
      )}
    </div>
  );
}
