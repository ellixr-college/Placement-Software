'use client';

import { api, apiList } from './api';

export type ApplicationFieldType = 'text' | 'textarea' | 'select' | 'number';

export interface ApplicationField {
  id: string;
  label: string;
  type: ApplicationFieldType;
  options?: string[];
  required?: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  jobType: string;
  workMode: string | null;
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  ctcMin: number | null;
  ctcMax: number | null;
  eligibleCourses: string[];
  eligibleBranches: string[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
  graduationYears: number[];
  applicationFormFields?: ApplicationField[];
  status: string;
  applicationDeadline: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  collegeId: string | null;
  companyId: string | null;
  company?: { id: string; name: string; logoUrl: string | null; industry: string | null };
  // PLATFORM jobs are broadcast by the Platform Admin; companyName is free-text.
  scope?: string;
  isPlatform?: boolean;
  companyName?: string | null;
  targetCollegeIds?: string[];
  applicationCount?: number;
  // student feed annotations
  applied?: boolean;
  myStage?: string | null;
  eligible?: boolean;
  eligibilityReasons?: string[];
}

export interface CreateJobInput {
  title: string;
  companyId: string;
  description?: string;
  jobType?: string;
  workMode?: string;
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  ctcMin?: number;
  ctcMax?: number;
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa?: number;
  minTenthPercentage?: number;
  minTwelfthPercentage?: number;
  eligibleGenders?: string[];
  maxActiveBacklogs?: number;
  maxTotalBacklogs?: number;
  applicationFormFields?: ApplicationField[];
  applicationDeadline?: string;
}

/** CTC range as "₹X–Y LPA". Treats null/0 as undisclosed (avoids "₹0.0–0.0 LPA"). */
export function formatCtc(min: number | null | undefined, max: number | null | undefined): string {
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (lo == null && hi == null) return 'Not disclosed';
  const lpa = (n: number) => (n / 100000).toFixed(2).replace(/\.?0+$/, '');
  if (lo != null && hi != null) {
    return lo === hi ? `₹${lpa(lo)} LPA` : `₹${lpa(lo)}–${lpa(hi)} LPA`;
  }
  return `₹${lpa((lo ?? hi)!)} LPA`;
}

export interface EligibleStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string;
  branch: string;
  cgpa: number | null;
}

// ─── Placement Officer ───
export async function listJobs(status = ''): Promise<Job[]> {
  const { data } = await apiList<Job[]>(`/jobs${status ? `?status=${status}` : ''}`);
  return data;
}

export function getJob(id: string): Promise<Job> {
  return api<Job>(`/jobs/${id}`);
}

export function createJob(input: CreateJobInput): Promise<Job> {
  return api(`/jobs`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateJob(id: string, input: Partial<CreateJobInput>): Promise<Job> {
  return api(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function publishJob(id: string): Promise<{ job: Job; eligibleCount: number }> {
  return api(`/jobs/${id}/publish`, { method: 'POST' });
}

export function closeJob(id: string): Promise<Job> {
  return api(`/jobs/${id}/close`, { method: 'POST' });
}

export function getEligibleStudents(id: string): Promise<EligibleStudent[]> {
  return api<EligibleStudent[]>(`/jobs/${id}/eligible-students`);
}

// ─── Student ───
export function getJobFeed(): Promise<Job[]> {
  return api<Job[]>(`/jobs`);
}

export function applyToJob(
  id: string,
  formResponses?: Record<string, string>,
): Promise<{ id: string }> {
  return api(`/jobs/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify(formResponses ? { formResponses } : {}),
  });
}
