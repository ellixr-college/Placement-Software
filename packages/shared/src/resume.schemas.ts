import { z } from 'zod';

/** Available starter resume templates. Student picks one for their public page. */
export const RESUME_TEMPLATES = ['professional', 'classic', 'modern'] as const;
export type ResumeTemplate = (typeof RESUME_TEMPLATES)[number];

const trimmed = (max: number) => z.string().trim().max(max);

export const resumeLinkSchema = z.object({
  label: trimmed(60),
  url: trimmed(300),
});

export const resumeEducationSchema = z.object({
  institution: trimmed(160),
  degree: trimmed(120).optional().default(''),
  field: trimmed(120).optional().default(''),
  startYear: trimmed(10).optional().default(''),
  endYear: trimmed(10).optional().default(''),
  score: trimmed(40).optional().default(''),
});

export const resumeExperienceSchema = z.object({
  company: trimmed(160),
  role: trimmed(120).optional().default(''),
  location: trimmed(120).optional().default(''),
  startDate: trimmed(40).optional().default(''),
  endDate: trimmed(40).optional().default(''),
  bullets: z.array(trimmed(400)).max(12).optional().default([]),
});

export const resumeProjectSchema = z.object({
  name: trimmed(160),
  description: trimmed(600).optional().default(''),
  link: trimmed(300).optional().default(''),
  tech: z.array(trimmed(40)).max(20).optional().default([]),
});

export const resumeCertificationSchema = z.object({
  name: trimmed(160),
  issuer: trimmed(160).optional().default(''),
  year: trimmed(10).optional().default(''),
});

/** The structured content a student fills in; rendered by the chosen template. */
export const resumeDataSchema = z.object({
  fullName: trimmed(120),
  headline: trimmed(160).optional().default(''),
  email: trimmed(160).optional().default(''),
  phone: trimmed(40).optional().default(''),
  location: trimmed(120).optional().default(''),
  links: z.array(resumeLinkSchema).max(8).optional().default([]),
  summary: trimmed(1500).optional().default(''),
  skills: z.array(trimmed(60)).max(60).optional().default([]),
  education: z.array(resumeEducationSchema).max(15).optional().default([]),
  experience: z.array(resumeExperienceSchema).max(20).optional().default([]),
  projects: z.array(resumeProjectSchema).max(20).optional().default([]),
  certifications: z.array(resumeCertificationSchema).max(20).optional().default([]),
  achievements: z.array(trimmed(300)).max(20).optional().default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
export type ResumeLink = z.infer<typeof resumeLinkSchema>;
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;
export type ResumeProject = z.infer<typeof resumeProjectSchema>;
export type ResumeCertification = z.infer<typeof resumeCertificationSchema>;

/** An empty resume scaffold, optionally pre-seeded from known student fields. */
export function emptyResumeData(seed: Partial<ResumeData> = {}): ResumeData {
  return resumeDataSchema.parse({ fullName: '', ...seed });
}
