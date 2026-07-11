'use client';

import { api, apiList, API_URL, getAccessToken, tryRefresh } from './api';

/** Upload a Job Description PDF (multipart) → returns its public URL + name. */
export async function uploadJobPdf(file: File): Promise<{ url: string; name: string }> {
  const send = () => {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    // No Content-Type header — the browser sets the multipart boundary itself.
    return fetch(`${API_URL}/jobs/upload-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? 'Upload failed');
  return body.data as { url: string; name: string };
}

/** Upload an offer letter PDF (multipart) → returns its public URL. */
export async function uploadOfferLetter(file: File): Promise<{ url: string; name: string }> {
  const send = () => {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    return fetch(`${API_URL}/jobs/upload-offer-letter`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? 'Upload failed');
  return body.data as { url: string; name: string };
}

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
  minUgPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
  graduationYears: number[];
  applicationFormFields?: ApplicationField[];
  pdfUrl?: string | null;
  pdfName?: string | null;
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
  companyId?: string;
  companyName?: string;
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
  minUgPercentage?: number;
  eligibleGenders?: string[];
  maxActiveBacklogs?: number;
  maxTotalBacklogs?: number;
  applicationFormFields?: ApplicationField[];
  pdfUrl?: string;
  pdfName?: string;
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

export function publishManyJobs(ids: string[]): Promise<{ count: number; jobs: Job[] }> {
  return api('/jobs/publish-many', { method: 'POST', body: JSON.stringify({ ids }) });
}

export function closeJob(id: string): Promise<Job> {
  return api(`/jobs/${id}/close`, { method: 'POST' });
}

export function deleteJob(id: string): Promise<{ success: boolean }> {
  return api(`/jobs/${id}`, { method: 'DELETE' });
}

export interface ApplicantRow {
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  resumeSlug: string | null;
  stage: string;
  appliedAt: string;
}

export function getJobApplicants(id: string): Promise<ApplicantRow[]> {
  return api<ApplicantRow[]>(`/jobs/${id}/applicants-export`);
}

/** Fetch the (private) JD PDF through the authenticated API and return a local
 * object URL for the viewer. Caller should URL.revokeObjectURL when done. */
export async function getJobPdfObjectUrl(id: string): Promise<string> {
  const send = () => {
    const token = getAccessToken();
    return fetch(`${API_URL}/jobs/${id}/pdf`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? 'Could not load PDF');
  }
  return URL.createObjectURL(await res.blob());
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
