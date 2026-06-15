'use client';

import { api, apiList } from './api';
import type { Job } from './jobs';

// A PLATFORM job is broadcast by the Platform Admin to a set of target colleges.
// It carries a free-text companyName (no Company row) and targetCollegeIds; each
// college still manages only its own applicants on the shared posting.
export type PlatformJob = Job;

export interface CreatePlatformJobInput {
  title: string;
  companyName: string;
  targetCollegeIds: string[];
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
  maxActiveBacklogs?: number;
  maxTotalBacklogs?: number;
  applicationDeadline?: string;
}

export type UpdatePlatformJobInput = Partial<CreatePlatformJobInput>;

export async function listPlatformJobs(status = ''): Promise<PlatformJob[]> {
  const { data } = await apiList<PlatformJob[]>(`/platform/jobs${status ? `?status=${status}` : ''}`);
  return data;
}

export function getPlatformJob(id: string): Promise<PlatformJob> {
  return api<PlatformJob>(`/platform/jobs/${id}`);
}

export function createPlatformJob(input: CreatePlatformJobInput): Promise<PlatformJob> {
  return api(`/platform/jobs`, { method: 'POST', body: JSON.stringify(input) });
}

export function updatePlatformJob(id: string, input: UpdatePlatformJobInput): Promise<PlatformJob> {
  return api(`/platform/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function publishPlatformJob(id: string): Promise<PlatformJob> {
  return api(`/platform/jobs/${id}/publish`, { method: 'POST' });
}

export function closePlatformJob(id: string): Promise<PlatformJob> {
  return api(`/platform/jobs/${id}/close`, { method: 'POST' });
}
