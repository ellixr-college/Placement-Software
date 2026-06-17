'use client';

import { use, useEffect, useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import { isValidEmail, isValidPhone } from '@ellixr/shared';
import {
  getPublicCollege,
  selfRegisterAlumni,
  type SelfRegisterInput,
} from '../../../../lib/alumni';

export default function AlumniRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPublicCollege(slug)
      .then((c) => setCollegeName(c.name))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <Card className="space-y-2 p-6 text-center">
        <h1 className="text-lg font-semibold text-strong">Registration link invalid</h1>
        <p className="text-sm text-subtle">
          This alumni registration link doesn&apos;t match an active college.
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <h1 className="text-lg font-semibold text-strong">Thanks for registering! 🎉</h1>
        <p className="text-sm text-body">
          Your details have been submitted to {collegeName}&apos;s placement cell. They&apos;ll
          review and add you to the alumni network shortly.
        </p>
      </Card>
    );
  }

  return (
    <RegisterForm
      slug={slug}
      collegeName={collegeName}
      onDone={() => setDone(true)}
    />
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function RegisterForm({
  slug,
  collegeName,
  onDone,
}: {
  slug: string;
  collegeName: string | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    graduationYear: String(new Date().getFullYear()),
    branch: '',
    course: '',
    currentCompany: '',
    currentDesignation: '',
    currentLocation: '',
    linkedinUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailOk = !form.email.trim() || isValidEmail(form.email);
  const phoneOk = !form.phone.trim() || isValidPhone(form.phone);
  const ready =
    form.fullName.trim() &&
    isValidEmail(form.email) &&
    form.branch.trim() &&
    form.graduationYear &&
    phoneOk;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: SelfRegisterInput = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        graduationYear: Number(form.graduationYear),
        branch: form.branch.trim(),
        phone: form.phone.trim() || undefined,
        course: form.course.trim() || undefined,
        currentCompany: form.currentCompany.trim() || undefined,
        currentDesignation: form.currentDesignation.trim() || undefined,
        currentLocation: form.currentLocation.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
      };
      await selfRegisterAlumni(slug, input);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register');
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="text-center">
        <span className="bg-gradient-primary bg-clip-text text-xl font-bold text-transparent">
          Ellixr
        </span>
        <h1 className="mt-2 text-lg font-semibold text-strong">
          Alumni registration{collegeName ? ` · ${collegeName}` : ''}
        </h1>
        <p className="text-sm text-subtle">
          Join your college&apos;s alumni network — stay in touch, mentor, and hire.
        </p>
      </div>

      <Field label="Full name *">
        <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
      </Field>
      <Field label="Email *">
        <input className={inputCls} value={form.email} onChange={set('email')} />
        {!emailOk && <span className="text-xs text-danger">Enter a valid email address.</span>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Graduation year *">
          <input
            type="number"
            className={inputCls}
            value={form.graduationYear}
            onChange={set('graduationYear')}
          />
        </Field>
        <Field label="Branch *">
          <input className={inputCls} value={form.branch} onChange={set('branch')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course">
          <input className={inputCls} value={form.course} onChange={set('course')} placeholder="B.Tech" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
          {!phoneOk && <span className="text-xs text-danger">Enter a valid 10-digit mobile.</span>}
        </Field>
      </div>
      <Field label="Current company">
        <input className={inputCls} value={form.currentCompany} onChange={set('currentCompany')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Designation">
          <input className={inputCls} value={form.currentDesignation} onChange={set('currentDesignation')} />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={form.currentLocation} onChange={set('currentLocation')} />
        </Field>
      </div>
      <Field label="LinkedIn URL">
        <input
          className={inputCls}
          value={form.linkedinUrl}
          onChange={set('linkedinUrl')}
          placeholder="https://linkedin.com/in/…"
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button className="w-full" onClick={submit} loading={saving} disabled={!ready}>
        {saving ? 'Submitting…' : 'Register'}
      </Button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
