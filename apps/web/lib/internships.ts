'use client';

import { api } from './api';

export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const INTERNSHIP_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type InternshipStatus = (typeof INTERNSHIP_STATUSES)[number];

export interface Internship {
  id: string;
  studentId: string;
  companyName: string;
  role: string;
  workMode: WorkMode | null;
  location: string | null;
  isPaid: boolean;
  stipend: number | null;
  startDate: string | null;
  endDate: string | null;
  isPpo: boolean;
  description: string | null;
  certificateUrl: string | null;
  status: InternshipStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  // Present only on officer list/detail.
  studentName?: string;
  rollNumber?: string;
}

export interface InternshipInput {
  companyName: string;
  role: string;
  workMode?: WorkMode;
  location?: string;
  isPaid?: boolean;
  stipend?: number;
  startDate?: string;
  endDate?: string;
  isPpo?: boolean;
  description?: string;
  certificateUrl?: string;
}

// ─── Student (self) ───
export const listMyInternships = () => api<Internship[]>('/me/internships');

export const createMyInternship = (input: InternshipInput) =>
  api<Internship>('/me/internships', { method: 'POST', body: JSON.stringify(input) });

export const updateMyInternship = (id: string, input: Partial<InternshipInput>) =>
  api<Internship>(`/me/internships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteMyInternship = (id: string) =>
  api<{ success: boolean }>(`/me/internships/${id}`, { method: 'DELETE' });

// ─── Officer / College Admin ───
export const listInternships = (status?: InternshipStatus) =>
  api<Internship[]>(`/internships${status ? `?status=${status}` : ''}`);

export const verifyInternship = (id: string, action: 'verify' | 'reject', reason?: string) =>
  api<Internship>(`/internships/${id}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason }),
  });
