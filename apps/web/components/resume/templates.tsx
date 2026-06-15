import type {
  ResumeData,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from '@ellixr/shared';

/** Picks the chosen template; falls back to Classic for unknown ids. */
export function ResumeView({ template, data }: { template: string; data: ResumeData }) {
  return template === 'modern' ? <ModernTemplate data={data} /> : <ClassicTemplate data={data} />;
}

function has<T>(arr: T[] | undefined): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

function contactLine(d: ResumeData): string {
  return [d.email, d.phone, d.location].filter(Boolean).join('  ·  ');
}

function dateRange(start?: string, end?: string): string {
  return [start, end].filter(Boolean).join(' – ');
}

// ─────────────────────────────── Classic ───────────────────────────────
// Single column, serif headings, understated. The safe, ATS-friendly default.
function ClassicTemplate({ data }: { data: ResumeData }) {
  return (
    <article className="mx-auto max-w-[820px] bg-white px-12 py-12 text-[13px] leading-relaxed text-neutral-800 print:px-0 print:py-0">
      <header className="border-b border-neutral-300 pb-4 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
          {data.fullName || 'Your Name'}
        </h1>
        {data.headline && <p className="mt-1 text-sm text-neutral-600">{data.headline}</p>}
        {contactLine(data) && <p className="mt-2 text-xs text-neutral-500">{contactLine(data)}</p>}
        {has(data.links) && (
          <p className="mt-1 text-xs">
            {data.links.map((l, i) => (
              <span key={i}>
                {i > 0 && <span className="text-neutral-300"> · </span>}
                <a href={l.url} className="text-blue-700 underline">
                  {l.label || l.url}
                </a>
              </span>
            ))}
          </p>
        )}
      </header>

      {data.summary && (
        <Section title="Summary">
          <p className="whitespace-pre-line">{data.summary}</p>
        </Section>
      )}

      {has(data.skills) && (
        <Section title="Skills">
          <p>{data.skills.join('  •  ')}</p>
        </Section>
      )}

      {has(data.experience) && (
        <Section title="Experience">
          <div className="space-y-3">
            {data.experience.map((e, i) => (
              <ExperienceBlock key={i} e={e} />
            ))}
          </div>
        </Section>
      )}

      {has(data.projects) && (
        <Section title="Projects">
          <div className="space-y-3">
            {data.projects.map((p, i) => (
              <ProjectBlock key={i} p={p} />
            ))}
          </div>
        </Section>
      )}

      {has(data.education) && (
        <Section title="Education">
          <div className="space-y-2">
            {data.education.map((ed, i) => (
              <EducationBlock key={i} ed={ed} />
            ))}
          </div>
        </Section>
      )}

      {has(data.certifications) && (
        <Section title="Certifications">
          <ul className="list-disc space-y-1 pl-5">
            {data.certifications.map((c, i) => (
              <li key={i}>
                {c.name}
                {c.issuer && ` — ${c.issuer}`}
                {c.year && ` (${c.year})`}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {has(data.achievements) && (
        <Section title="Achievements">
          <ul className="list-disc space-y-1 pl-5">
            {data.achievements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b border-neutral-200 pb-1 font-serif text-sm font-bold uppercase tracking-widest text-neutral-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExperienceBlock({ e }: { e: ResumeExperience }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-semibold text-neutral-900">
          {e.role}
          {e.company && <span className="font-normal text-neutral-600"> · {e.company}</span>}
        </p>
        <p className="shrink-0 text-xs text-neutral-500">{dateRange(e.startDate, e.endDate)}</p>
      </div>
      {e.location && <p className="text-xs text-neutral-500">{e.location}</p>}
      {has(e.bullets) && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {e.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectBlock({ p }: { p: ResumeProject }) {
  return (
    <div>
      <p className="font-semibold text-neutral-900">
        {p.name}
        {p.link && (
          <a href={p.link} className="ml-2 text-xs font-normal text-blue-700 underline">
            link
          </a>
        )}
      </p>
      {p.description && <p className="text-neutral-700">{p.description}</p>}
      {has(p.tech) && <p className="mt-0.5 text-xs text-neutral-500">{p.tech.join(' · ')}</p>}
    </div>
  );
}

function EducationBlock({ ed }: { ed: ResumeEducation }) {
  const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <p className="font-semibold text-neutral-900">{ed.institution || degree}</p>
        {ed.institution && degree && <p className="text-neutral-600">{degree}</p>}
        {ed.score && <p className="text-xs text-neutral-500">{ed.score}</p>}
      </div>
      <p className="shrink-0 text-xs text-neutral-500">{dateRange(ed.startYear, ed.endYear)}</p>
    </div>
  );
}

// ─────────────────────────────── Modern ───────────────────────────────
// Two-column with a coral sidebar for contact/skills; bolder, designed feel.
function ModernTemplate({ data }: { data: ResumeData }) {
  return (
    <article className="mx-auto grid max-w-[860px] grid-cols-[260px_1fr] bg-white text-[13px] leading-relaxed text-neutral-800 print:max-w-none">
      <aside className="bg-[#F0764A] px-6 py-10 text-white">
        <h1 className="text-2xl font-bold leading-tight">{data.fullName || 'Your Name'}</h1>
        {data.headline && <p className="mt-1 text-sm text-white/90">{data.headline}</p>}

        <SideBlock title="Contact">
          <div className="space-y-1 text-xs text-white/90">
            {data.email && <p className="break-all">{data.email}</p>}
            {data.phone && <p>{data.phone}</p>}
            {data.location && <p>{data.location}</p>}
            {has(data.links) &&
              data.links.map((l, i) => (
                <p key={i} className="break-all">
                  <a href={l.url} className="underline">
                    {l.label || l.url}
                  </a>
                </p>
              ))}
          </div>
        </SideBlock>

        {has(data.skills) && (
          <SideBlock title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span key={i} className="rounded bg-white/15 px-2 py-0.5 text-xs">
                  {s}
                </span>
              ))}
            </div>
          </SideBlock>
        )}

        {has(data.education) && (
          <SideBlock title="Education">
            <div className="space-y-3">
              {data.education.map((ed, i) => (
                <div key={i} className="text-xs text-white/90">
                  <p className="font-semibold text-white">{ed.institution || ed.degree}</p>
                  <p>{[ed.degree, ed.field].filter(Boolean).join(', ')}</p>
                  <p className="text-white/70">
                    {[dateRange(ed.startYear, ed.endYear), ed.score].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </SideBlock>
        )}

        {has(data.certifications) && (
          <SideBlock title="Certifications">
            <ul className="space-y-1 text-xs text-white/90">
              {data.certifications.map((c, i) => (
                <li key={i}>
                  {c.name}
                  {c.year && ` (${c.year})`}
                </li>
              ))}
            </ul>
          </SideBlock>
        )}
      </aside>

      <main className="px-8 py-10">
        {data.summary && (
          <ModernSection title="Profile">
            <p className="whitespace-pre-line text-neutral-700">{data.summary}</p>
          </ModernSection>
        )}

        {has(data.experience) && (
          <ModernSection title="Experience">
            <div className="space-y-4">
              {data.experience.map((e, i) => (
                <ExperienceBlock key={i} e={e} />
              ))}
            </div>
          </ModernSection>
        )}

        {has(data.projects) && (
          <ModernSection title="Projects">
            <div className="space-y-4">
              {data.projects.map((p, i) => (
                <ProjectBlock key={i} p={p} />
              ))}
            </div>
          </ModernSection>
        )}

        {has(data.achievements) && (
          <ModernSection title="Achievements">
            <ul className="list-disc space-y-1 pl-5">
              {data.achievements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </ModernSection>
        )}
      </main>
    </article>
  );
}

function SideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/80">{title}</h2>
      {children}
    </div>
  );
}

function ModernSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-[#F0764A]">{title}</h2>
      {children}
    </section>
  );
}
