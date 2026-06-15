'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@ellixr/ui';
import { createStudent, type CreateStudentInput } from '../../../../lib/students';

const EMPTY = {
  fullName: '',
  email: '',
  rollNumber: '',
  course: '',
  branch: '',
  graduationYear: '',
  enrollmentNumber: '',
  phone: '',
  cgpa: '',
  activeBacklogs: '',
  totalBacklogs: '',
};

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ fullName: string; email: string; tempPassword: string } | null>(
    null,
  );

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const input: CreateStudentInput = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        rollNumber: form.rollNumber.trim(),
        course: form.course.trim(),
        branch: form.branch.trim(),
        graduationYear: Number(form.graduationYear),
        enrollmentNumber: form.enrollmentNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        cgpa: form.cgpa === '' ? undefined : Number(form.cgpa),
        activeBacklogs: form.activeBacklogs === '' ? undefined : Number(form.activeBacklogs),
        totalBacklogs: form.totalBacklogs === '' ? undefined : Number(form.totalBacklogs),
      };
      const res = await createStudent(input);
      setCreated({
        fullName: res.student.user.fullName,
        email: res.student.user.email,
        tempPassword: res.tempPassword,
      });
      setForm({ ...EMPTY });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create student');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-strong">Student registered</h1>
        <Card className="space-y-4 p-6">
          <p className="text-sm text-strong">
            <span className="font-semibold">{created.fullName}</span> can now sign in. Share these
            credentials — they&apos;ll be asked to set a new password on first login.
          </p>
          <dl className="space-y-2 rounded-md bg-app p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Email</dt>
              <dd className="font-mono text-strong">{created.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Temporary password</dt>
              <dd className="font-mono text-strong">{created.tempPassword}</dd>
            </div>
          </dl>
          <p className="text-xs text-subtle">
            This password is shown once. Email delivery is wired up in a later phase.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setCreated(null)}>Add another</Button>
            <Link href="/students">
              <Button variant="ghost">Back to list</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Add student</h1>
        <Link href="/students" className="text-sm text-primary-600 hover:underline">
          Cancel
        </Link>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required value={form.fullName} onChange={set('fullName')} />
          <Field label="Email" type="email" required value={form.email} onChange={set('email')} />
          <Field label="Roll number" required value={form.rollNumber} onChange={set('rollNumber')} />
          <Field
            label="Enrollment number"
            value={form.enrollmentNumber}
            onChange={set('enrollmentNumber')}
          />
          <Field label="Course" required value={form.course} onChange={set('course')} placeholder="B.Tech" />
          <Field label="Branch" required value={form.branch} onChange={set('branch')} placeholder="CSE" />
          <Field
            label="Graduation year"
            type="number"
            required
            value={form.graduationYear}
            onChange={set('graduationYear')}
            placeholder="2027"
          />
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="CGPA" type="number" value={form.cgpa} onChange={set('cgpa')} placeholder="8.2" />
          <Field
            label="Active backlogs"
            type="number"
            value={form.activeBacklogs}
            onChange={set('activeBacklogs')}
          />
          <Field
            label="Total backlogs"
            type="number"
            value={form.totalBacklogs}
            onChange={set('totalBacklogs')}
          />

          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}

          <div className="sm:col-span-2">
            <Button type="submit" size="lg" loading={loading}>
              {loading ? 'Registering…' : 'Register student'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-strong">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
