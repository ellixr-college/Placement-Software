'use client';

import { api } from './api';

export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

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
  // Point-of-contact at the company.
  pocName: string | null;
  pocEmail: string | null;
  pocPhone: string | null;
  certificateUrl: string | null;
  createdAt: string;
  // Present only on the officer list (used to group batch by batch).
  studentName?: string;
  rollNumber?: string;
  studentCourse?: string;
  graduationYear?: number;
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
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
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

// ─── Officer / College Admin (read-only) ───
export const listInternships = () => api<Internship[]>('/internships');
