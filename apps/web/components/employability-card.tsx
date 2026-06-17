'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, ProgressBar } from '@ellixr/ui';
import { useConfirm } from './confirm-provider';
import {
  CATEGORY_LABELS,
  COMPLETION_STATUSES,
  STATUS_LABELS,
  deleteRecord,
  getStudentEmployability,
  listPrograms,
  updateStudentScores,
  upsertRecord,
  type CompletionStatus,
  type EmployabilitySummary,
  type TrainingProgram,
} from '../lib/training';

const inputCls =
  'h-9 w-full rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary-400';

/** Officer view: edit a student's assessment scores + training records, see readiness. */
export function EmployabilityCard({ studentId }: { studentId: string }) {
  const confirm = useConfirm();
  const [data, setData] = useState<EmployabilitySummary | null>(null);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [summary, progs] = await Promise.all([
        getStudentEmployability(studentId),
        listPrograms(),
      ]);
      setData(summary);
      setPrograms(progs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employability');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (loading) return <Card className="p-6 text-sm text-subtle">Loading employability…</Card>;
  if (!data) return <Card className="p-6 text-sm text-danger">{error ?? 'No data'}</Card>;

  const enrolledIds = new Set(data.records.map((r) => r.programId));
  const available = programs.filter((p) => !enrolledIds.has(p.id));

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-subtle">Employability readiness</p>
          <p className="text-3xl font-semibold text-strong">
            {data.readiness != null ? `${data.readiness}%` : '—'}
          </p>
        </div>
        <Badge tint={readinessTint(data.readiness)}>{readinessLabel(data.readiness)}</Badge>
      </div>

      {data.readiness != null && (
        <ProgressBar value={data.readiness} fillClassName="bg-gradient-primary" />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <ScoresEditor studentId={studentId} scores={data.scores} onSaved={(d) => setData(d)} />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-subtle">Training records</p>
        {data.records.length === 0 ? (
          <p className="text-sm text-subtle">Not enrolled in any program yet.</p>
        ) : (
          <div className="space-y-2">
            {data.records.map((r) => (
              <RecordRow
                key={r.id}
                studentId={studentId}
                record={r}
                onChange={(d) => setData(d)}
                onRemove={async () => {
                  const ok = await confirm({
                    title: `Remove from “${r.programName}”?`,
                    confirmLabel: 'Remove',
                    destructive: true,
                  });
                  if (!ok) return;
                  await deleteRecord(r.id);
                  load();
                }}
              />
            ))}
          </div>
        )}
        {available.length > 0 && (
          <Enroller
            studentId={studentId}
            programs={available}
            onEnrolled={(d) => setData(d)}
          />
        )}
      </div>
    </Card>
  );
}

function ScoresEditor({
  studentId,
  scores,
  onSaved,
}: {
  studentId: string;
  scores: EmployabilitySummary['scores'];
  onSaved: (d: EmployabilitySummary) => void;
}) {
  const [form, setForm] = useState({
    aptitudeScore: scores.aptitude?.toString() ?? '',
    communicationScore: scores.communication?.toString() ?? '',
    interviewScore: scores.interview?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
      const d = await updateStudentScores(studentId, {
        aptitudeScore: num(form.aptitudeScore),
        communicationScore: num(form.communicationScore),
        interviewScore: num(form.interviewScore),
      });
      onSaved(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save scores');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-card border border-border p-4">
      <p className="text-xs font-semibold uppercase text-subtle">Assessment scores (0–100)</p>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['aptitudeScore', 'Aptitude'],
            ['communicationScore', 'Communication'],
            ['interviewScore', 'Interview'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs text-subtle">{label}</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button size="sm" onClick={save} loading={saving}>
        {saving ? 'Saving…' : 'Save scores'}
      </Button>
    </div>
  );
}

function RecordRow({
  studentId,
  record,
  onChange,
  onRemove,
}: {
  studentId: string;
  record: EmployabilitySummary['records'][number];
  onChange: (d: EmployabilitySummary) => void;
  onRemove: () => void;
}) {
  const [status, setStatus] = useState<CompletionStatus>(record.completionStatus);
  const [attendance, setAttendance] = useState(record.attendancePercent?.toString() ?? '');
  const [score, setScore] = useState(record.score?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
      await upsertRecord({
        studentId,
        programId: record.programId,
        completionStatus: status,
        attendancePercent: num(attendance),
        score: num(score),
      });
      onChange(await getStudentEmployability(studentId));
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    status !== record.completionStatus ||
    attendance !== (record.attendancePercent?.toString() ?? '') ||
    score !== (record.score?.toString() ?? '');

  return (
    <div className="rounded-card border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-strong">{record.programName}</span>
          <Badge tint="lavender" className="ml-2">
            {CATEGORY_LABELS[record.category]}
          </Badge>
        </div>
        <button onClick={onRemove} className="text-xs text-danger hover:underline">
          Remove
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="block space-y-1">
          <span className="text-xs text-subtle">Status</span>
          <select
            className={inputCls}
            value={status}
            onChange={(e) => setStatus(e.target.value as CompletionStatus)}
          >
            {COMPLETION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-subtle">Attendance %</span>
          <input
            type="number"
            min={0}
            max={100}
            className={inputCls}
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-subtle">Score</span>
          <input
            type="number"
            min={0}
            max={100}
            className={inputCls}
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </label>
      </div>
      {dirty && (
        <Button size="sm" variant="outline" className="mt-2" onClick={save} loading={saving}>
          {saving ? 'Saving…' : 'Update'}
        </Button>
      )}
    </div>
  );
}

function Enroller({
  studentId,
  programs,
  onEnrolled,
}: {
  studentId: string;
  programs: TrainingProgram[];
  onEnrolled: (d: EmployabilitySummary) => void;
}) {
  const [programId, setProgramId] = useState('');
  const [saving, setSaving] = useState(false);

  async function enroll() {
    if (!programId) return;
    setSaving(true);
    try {
      await upsertRecord({ studentId, programId, completionStatus: 'NOT_STARTED' });
      setProgramId('');
      onEnrolled(await getStudentEmployability(studentId));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <label className="block flex-1 space-y-1">
        <span className="text-xs text-subtle">Enrol in program</span>
        <select className={inputCls} value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">Select a program…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <Button size="sm" onClick={enroll} loading={saving} disabled={!programId}>
        Enrol
      </Button>
    </div>
  );
}

function readinessLabel(v: number | null): string {
  if (v == null) return 'No data';
  if (v >= 75) return 'Job ready';
  if (v >= 50) return 'Developing';
  return 'Needs work';
}

function readinessTint(v: number | null): 'mint' | 'cream' | 'rose' | 'lavender' {
  if (v == null) return 'lavender';
  if (v >= 75) return 'mint';
  if (v >= 50) return 'cream';
  return 'rose';
}
