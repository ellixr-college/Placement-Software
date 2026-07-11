'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@ellixr/ui';
import { Breadcrumbs } from '../../../components/breadcrumbs';
import { BatchCards } from '../../../components/batch-cards';
import { ListSkeleton } from '../../../components/page-skeleton';
import { listInternships, type Internship } from '../../../lib/internships';

interface Year {
  key: string;
  year: number;
  items: Internship[];
}

interface Course {
  key: string;
  year: number;
  course: string;
  items: Internship[];
}

type ViewState =
  | { mode: 'years' }
  | { mode: 'courses'; year: number }
  | { mode: 'table'; year: number; course: string };

/** Officer view: student-reported internships.
 * Drill-down: Years → Courses → Table.
 * Read-only — students self-report; there is no verification. */
export default function InternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ mode: 'years' });

  useEffect(() => {
    (async () => {
      try {
        setItems(await listInternships());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load internships');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const years = useMemo<Year[]>(() => {
    const map = new Map<string, Year>();
    for (const i of items) {
      const year = i.graduationYear ?? 0;
      const key = String(year);
      if (!map.has(key)) map.set(key, { key, year, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort((a, b) => b.year - a.year);
  }, [items]);

  const coursesForYear = useMemo<Course[]>(() => {
    if (view.mode !== 'courses' && view.mode !== 'table') return [];
    const map = new Map<string, Course>();
    for (const i of items) {
      if ((i.graduationYear ?? 0) !== view.year) continue;
      const course = i.studentCourse ?? 'Unknown';
      const key = `${view.year}|${course}`;
      if (!map.has(key)) map.set(key, { key, year: view.year, course, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort((a, b) => a.course.localeCompare(b.course));
  }, [items, view]);

  const tableItems = useMemo<Internship[]>(() => {
    if (view.mode !== 'table') return [];
    return items
      .filter(
        (i) =>
          (i.graduationYear ?? 0) === view.year && (i.studentCourse ?? 'Unknown') === view.course,
      )
      .sort((a, b) => (a.studentName ?? '').localeCompare(b.studentName ?? ''));
  }, [items, view]);

  const title = useMemo(() => {
    if (view.mode === 'years') return 'Internships';
    if (view.mode === 'courses') return `Internships · ${view.year}`;
    return `Internships · ${view.year} · ${view.course}`;
  }, [view]);

  const subtitle = useMemo(() => {
    if (view.mode === 'years') {
      return `Internships students found on their own · ${items.length} total across ${years.length} ${years.length === 1 ? 'year' : 'years'}`;
    }
    if (view.mode === 'courses') {
      return `${coursesForYear.length} ${coursesForYear.length === 1 ? 'course' : 'courses'} in ${view.year}`;
    }
    return `${tableItems.length} ${tableItems.length === 1 ? 'student' : 'students'} in ${view.course} ${view.year}`;
  }, [items.length, years.length, coursesForYear.length, tableItems.length, view]);

  const breadcrumbCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'Internships', onClick: () => setView({ mode: 'years' }) },
    ];
    if (view.mode === 'courses') {
      crumbs.push({ label: String(view.year) });
    } else if (view.mode === 'table') {
      crumbs.push({
        label: String(view.year),
        onClick: () => setView({ mode: 'courses', year: view.year }),
      });
      crumbs.push({ label: view.course });
    }
    return crumbs;
  }, [view]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Breadcrumbs crumbs={breadcrumbCrumbs} />
        <h1 className="text-2xl font-semibold text-strong">{title}</h1>
        <p className="text-sm text-subtle">{subtitle}</p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No internships submitted yet.</Card>
      ) : view.mode === 'years' ? (
        <BatchCards
          items={years.map((y) => ({
            key: y.key,
            title: String(y.year || '—'),
            category: 'Graduation Year',
            stats: [
              { label: y.items.length === 1 ? 'internship' : 'internships', value: y.items.length },
              {
                label: 'courses',
                value: new Set(y.items.map((i) => i.studentCourse)).size,
              },
            ],
          }))}
          onSelect={(key) => {
            const year = years.find((y) => y.key === key)?.year ?? 0;
            setView({ mode: 'courses', year });
          }}
        />
      ) : view.mode === 'courses' ? (
        <>
          <button
            onClick={() => setView({ mode: 'years' })}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All years
          </button>
          <BatchCards
            items={coursesForYear.map((c) => ({
              key: c.key,
              title: c.course,
              category: `${c.year} · Course`,
              stats: [
                {
                  label: c.items.length === 1 ? 'internship' : 'internships',
                  value: c.items.length,
                },
                {
                  label: 'students',
                  value: new Set(c.items.map((i) => i.studentId)).size,
                },
              ],
            }))}
            onSelect={(key) => {
              const course = coursesForYear.find((c) => c.key === key)?.course ?? '';
              setView({ mode: 'table', year: view.year, course });
            }}
          />
        </>
      ) : (
        <>
          <button
            onClick={() => setView({ mode: 'courses', year: view.year })}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All courses in {view.year}
          </button>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Roll No.</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Stipend</th>
                  <th className="px-4 py-3 font-medium">Point of Contact</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-subtle">
                      No internships found for this batch.
                    </td>
                  </tr>
                ) : (
                  tableItems.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-app/60">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-strong">{i.studentName ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-strong">{i.rollNumber ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-strong">{i.companyName}</p>
                        {i.isPpo && (
                          <span className="text-[10px] font-medium text-success">PPO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">{i.role}</td>
                      <td className="px-4 py-3 align-top">{i.location || '—'}</td>
                      <td className="px-4 py-3 align-top">{i.workMode ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        {i.startDate ? fmt(i.startDate) : '—'}
                        {i.endDate ? ` → ${fmt(i.endDate)}` : i.startDate ? ' → Present' : ''}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {i.isPaid
                          ? i.stipend
                            ? `₹${i.stipend.toLocaleString()}`
                            : 'Paid'
                          : 'Unpaid'}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 align-top">
                        <div className="whitespace-normal text-xs leading-relaxed">
                          <p className="font-medium text-strong">{i.pocName}</p>
                          <p className="text-subtle">{i.pocEmail}</p>
                          <p className="text-subtle">{i.pocPhone}</p>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
