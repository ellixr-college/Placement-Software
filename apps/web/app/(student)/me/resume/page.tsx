'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import {
  emptyResumeData,
  RESUME_TEMPLATES,
  type ResumeData,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeProject,
  type ResumeCertification,
} from '@ellixr/shared';
import { getMyResume, saveMyResume, type MyResume } from '../../../../lib/resume';

export default function ResumeEditorPage() {
  const [meta, setMeta] = useState<MyResume | null>(null);
  const [data, setData] = useState<ResumeData>(emptyResumeData());
  const [template, setTemplate] = useState('professional');
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getMyResume();
        setMeta(r);
        setData(emptyResumeData(r.data));
        setTemplate(r.template);
        setPublished(r.isPublished);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resume');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function patch(p: Partial<ResumeData>) {
    setData((d) => ({ ...d, ...p }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const r = await saveMyResume({ template, isPublished: published, data });
      setMeta(r);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;

  const link = meta ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${meta.publicSlug}` : '';

  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-strong">My resume</h1>
        <p className="text-sm text-subtle">Fill in your details, pick a template, and share the link.</p>
      </header>

      {/* Public link */}
      {meta && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-strong">Your public link</p>
            <label className="flex items-center gap-2 text-xs text-subtle">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => {
                  setPublished(e.target.checked);
                  setSaved(false);
                }}
              />
              Published
            </label>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-app p-2">
            <code className="flex-1 truncate text-xs text-strong">{link}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(link)}
              className="rounded bg-white px-2 py-1 text-xs font-medium text-primary-600 shadow-sm"
            >
              Copy
            </button>
            <a
              href={`/r/${meta.publicSlug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-white px-2 py-1 text-xs font-medium text-primary-600 shadow-sm"
            >
              Open
            </a>
          </div>
          {!published && (
            <p className="text-xs text-subtle">
              Unpublished — the link returns “not found” until you publish and save.
            </p>
          )}
        </Card>
      )}

      {/* Template picker */}
      <Card className="space-y-2 p-4">
        <p className="text-sm font-medium text-strong">Template</p>
        <div className="grid grid-cols-2 gap-2">
          {RESUME_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTemplate(t);
                setSaved(false);
              }}
              className={`rounded-md border px-3 py-2 text-sm capitalize ${
                template === t
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border text-strong'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      {/* Basics */}
      <Section title="Basics">
        <Text label="Full name" value={data.fullName} onChange={(v) => patch({ fullName: v })} />
        <Text label="Headline" value={data.headline} onChange={(v) => patch({ headline: v })} placeholder="Final-year CSE · Aspiring SDE" />
        <Text label="Email" value={data.email} onChange={(v) => patch({ email: v })} />
        <Text label="Phone" value={data.phone} onChange={(v) => patch({ phone: v })} />
        <Text label="Location" value={data.location} onChange={(v) => patch({ location: v })} />
      </Section>

      {/* Links */}
      <ArraySection
        title="Links"
        items={data.links}
        onAdd={() => patch({ links: [...data.links, { label: '', url: '' }] })}
        onRemove={(i) => patch({ links: data.links.filter((_, x) => x !== i) })}
        render={(l, i) => (
          <>
            <Text label="Label" value={l.label} onChange={(v) => patch({ links: replace(data.links, i, { ...l, label: v }) })} placeholder="GitHub" />
            <Text label="URL" value={l.url} onChange={(v) => patch({ links: replace(data.links, i, { ...l, url: v }) })} placeholder="https://…" />
          </>
        )}
      />

      {/* Summary */}
      <Section title="Summary">
        <Area value={data.summary} onChange={(v) => patch({ summary: v })} placeholder="2–3 lines about you." />
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <Area
          value={data.skills.join(', ')}
          onChange={(v) => patch({ skills: splitList(v, ',') })}
          placeholder="Comma-separated: React, Node.js, SQL"
        />
      </Section>

      {/* Experience */}
      <ArraySection
        title="Experience"
        items={data.experience}
        onAdd={() =>
          patch({ experience: [...data.experience, blankExperience()] })
        }
        onRemove={(i) => patch({ experience: data.experience.filter((_, x) => x !== i) })}
        render={(e, i) => {
          const set = (p: Partial<ResumeExperience>) =>
            patch({ experience: replace(data.experience, i, { ...e, ...p }) });
          return (
            <>
              <Text label="Role" value={e.role} onChange={(v) => set({ role: v })} />
              <Text label="Company" value={e.company} onChange={(v) => set({ company: v })} />
              <Text label="Location" value={e.location} onChange={(v) => set({ location: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Text label="Start" value={e.startDate} onChange={(v) => set({ startDate: v })} placeholder="Jun 2025" />
                <Text label="End" value={e.endDate} onChange={(v) => set({ endDate: v })} placeholder="Present" />
              </div>
              <Area
                label="Highlights (one per line)"
                value={e.bullets.join('\n')}
                onChange={(v) => set({ bullets: splitList(v, '\n') })}
              />
            </>
          );
        }}
      />

      {/* Projects */}
      <ArraySection
        title="Projects"
        items={data.projects}
        onAdd={() => patch({ projects: [...data.projects, blankProject()] })}
        onRemove={(i) => patch({ projects: data.projects.filter((_, x) => x !== i) })}
        render={(p, i) => {
          const set = (up: Partial<ResumeProject>) =>
            patch({ projects: replace(data.projects, i, { ...p, ...up }) });
          return (
            <>
              <Text label="Name" value={p.name} onChange={(v) => set({ name: v })} />
              <Text label="Link" value={p.link} onChange={(v) => set({ link: v })} placeholder="https://…" />
              <Area label="Description" value={p.description} onChange={(v) => set({ description: v })} />
              <Text label="Tech (comma-separated)" value={p.tech.join(', ')} onChange={(v) => set({ tech: splitList(v, ',') })} />
            </>
          );
        }}
      />

      {/* Education */}
      <ArraySection
        title="Education"
        items={data.education}
        onAdd={() => patch({ education: [...data.education, blankEducation()] })}
        onRemove={(i) => patch({ education: data.education.filter((_, x) => x !== i) })}
        render={(ed, i) => {
          const set = (up: Partial<ResumeEducation>) =>
            patch({ education: replace(data.education, i, { ...ed, ...up }) });
          return (
            <>
              <Text label="Institution" value={ed.institution} onChange={(v) => set({ institution: v })} />
              <Text label="Degree" value={ed.degree} onChange={(v) => set({ degree: v })} />
              <Text label="Field" value={ed.field} onChange={(v) => set({ field: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Text label="Start year" value={ed.startYear} onChange={(v) => set({ startYear: v })} />
                <Text label="End year" value={ed.endYear} onChange={(v) => set({ endYear: v })} />
              </div>
              <Text label="Score" value={ed.score} onChange={(v) => set({ score: v })} placeholder="CGPA 8.4" />
            </>
          );
        }}
      />

      {/* Certifications */}
      <ArraySection
        title="Certifications"
        items={data.certifications}
        onAdd={() => patch({ certifications: [...data.certifications, { name: '', issuer: '', year: '' }] })}
        onRemove={(i) => patch({ certifications: data.certifications.filter((_, x) => x !== i) })}
        render={(c, i) => {
          const set = (up: Partial<ResumeCertification>) =>
            patch({ certifications: replace(data.certifications, i, { ...c, ...up }) });
          return (
            <>
              <Text label="Name" value={c.name} onChange={(v) => set({ name: v })} />
              <Text label="Issuer" value={c.issuer} onChange={(v) => set({ issuer: v })} />
              <Text label="Year" value={c.year} onChange={(v) => set({ year: v })} />
            </>
          );
        }}
      />

      {/* Achievements */}
      <Section title="Achievements">
        <Area
          value={data.achievements.join('\n')}
          onChange={(v) => patch({ achievements: splitList(v, '\n') })}
          placeholder="One per line"
        />
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Sticky save bar */}
      <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded-pill bg-white/95 p-2 shadow-nav backdrop-blur">
        <Button className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save resume'}
        </Button>
        {saved && <span className="pr-2 text-sm text-success">Saved ✓</span>}
      </div>
    </div>
  );
}

// ── helpers ──
function replace<T>(arr: T[], i: number, v: T): T[] {
  return arr.map((x, idx) => (idx === i ? v : x));
}
function splitList(v: string, sep: string): string[] {
  return v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}
const blankExperience = (): ResumeExperience => ({
  company: '', role: '', location: '', startDate: '', endDate: '', bullets: [],
});
const blankProject = (): ResumeProject => ({ name: '', description: '', link: '', tech: [] });
const blankEducation = (): ResumeEducation => ({
  institution: '', degree: '', field: '', startYear: '', endYear: '', score: '',
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">{title}</p>
      {children}
    </Card>
  );
}

function ArraySection<T>({
  title,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-strong">{title}</p>
        <button onClick={onAdd} className="text-sm font-medium text-primary-600">
          + Add
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-subtle">None added yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border p-3">
          {render(item, i)}
          <button onClick={() => onRemove(i)} className="text-xs text-danger">
            Remove
          </button>
        </div>
      ))}
    </Card>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-subtle">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-subtle">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
      />
    </div>
  );
}
