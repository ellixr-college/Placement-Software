'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@ellixr/ui';
import { createStudent, type CreateStudentInput } from '../../../../lib/students';
import { listMyCourses, type CollegeCourse } from '../../../../lib/courses';
import { CopyButton } from '../../../../components/copy-button';

const EMPTY = {
  fullName: '',
  email: '',
  rollNumber: '',
  course: '',
  branch: '',
  graduationYear: '',
  currentYear: '',
  enrollmentNumber: '',
  phone: '',
  cgpa: '',
  activeBacklogs: '',
  totalBacklogs: '',
  dateOfBirth: '',
  gender: '',
  personalEmail: '',
  linkedinUrl: '',
  tenthPercentage: '',
  twelfthPercentage: '',
  ugPercentage: '',
};

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ fullName: string; email: string; tempPassword: string } | null>(
    null,
  );

  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  useEffect(() => {
    listMyCourses().then(setCourses).catch(() => {});
  }, []);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Reset branch whenever the course changes.
  const setCourse = (v: string) => setForm((f) => ({ ...f, course: v, branch: '' }));
  const branchesFor = courses.find((c) => c.name === form.course)?.branches ?? [];

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
        currentYear: form.currentYear === '' ? undefined : Number(form.currentYear),
        enrollmentNumber: form.enrollmentNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        cgpa: form.cgpa === '' ? undefined : Number(form.cgpa),
        activeBacklogs: form.activeBacklogs === '' ? undefined : Number(form.activeBacklogs),
        totalBacklogs: form.totalBacklogs === '' ? undefined : Number(form.totalBacklogs),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        personalEmail: form.personalEmail.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        tenthPercentage: form.tenthPercentage === '' ? undefined : Number(form.tenthPercentage),
        twelfthPercentage: form.twelfthPercentage === '' ? undefined : Number(form.twelfthPercentage),
        ugPercentage: form.ugPercentage === '' ? undefined : Number(form.ugPercentage),
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
            <span className="font-semibold">{created.fullName}</span> can now sign in with the email
            and password below. They can change the password later from their profile.
          </p>
          <dl className="space-y-2 rounded-md bg-app p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-subtle">Email</dt>
              <dd className="flex items-center gap-2 font-mono text-strong">
                {created.email}
                <CopyButton value={created.email} className="px-2 py-1" />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-subtle">Password</dt>
              <dd className="flex items-center gap-2 font-mono text-strong">
                {created.tempPassword}
                <CopyButton value={created.tempPassword} className="px-2 py-1" />
              </dd>
            </div>
          </dl>
          <p className="text-xs text-subtle">
            Every student is created with the password <b>password123</b> for now.
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
          {courses.length > 0 ? (
            <SelectField label="Course" required value={form.course} onChange={setCourse} options={courses.map((c) => c.name)} placeholder="Select a course…" />
          ) : (
            <Field label="Course" required value={form.course} onChange={setCourse} placeholder="B.Tech" />
          )}
          {branchesFor.length > 0 ? (
            <SelectField label="Branch" required value={form.branch} onChange={set('branch')} options={branchesFor} placeholder="Select a branch…" />
          ) : (
            <Field label="Branch" value={form.branch} onChange={set('branch')} placeholder={form.course ? 'No branches for this course' : 'CSE'} />
          )}
          <Field
            label="Passout year"
            type="number"
            required
            value={form.graduationYear}
            onChange={set('graduationYear')}
            placeholder="2027"
          />
          <SelectField
            label="Current year of study"
            value={form.currentYear}
            onChange={set('currentYear')}
            options={['1', '2', '3', '4']}
            placeholder="Not tracked"
          />
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="Percentage (%)" type="number" value={form.cgpa} onChange={set('cgpa')} placeholder="85" />
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
          <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          <SelectField label="Gender" value={form.gender} onChange={set('gender')} options={GENDERS} placeholder="Not specified" />
          <Field label="Personal email" type="email" value={form.personalEmail} onChange={set('personalEmail')} />
          <Field label="LinkedIn" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/…" />
          <Field label="10th %" type="number" value={form.tenthPercentage} onChange={set('tenthPercentage')} placeholder="85" />
          <Field label="12th %" type="number" value={form.twelfthPercentage} onChange={set('twelfthPercentage')} placeholder="82" />
          <Field label="UG %" type="number" value={form.ugPercentage} onChange={set('ugPercentage')} placeholder="70" />
          <p className="text-xs text-subtle sm:col-span-2">
            &ldquo;Percentage&rdquo; is the current/PG course; UG % is the undergraduate degree (for PG students).
          </p>

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

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-strong">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
