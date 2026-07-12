'use client';

import { api } from './api';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const employmentTypeLabel = (t: EmploymentType | null | undefined) => {
  if (!t) return null;
  return t === 'FULL_TIME' ? 'Full-time' : 'Part-time';
};

export interface Internship {
  id: string;
  studentId: string;
  companyName: string;
  role: string;
  employmentType: EmploymentType | null;
  domain: string | null;
  skills: string | null;
  location: string;
  isPaid: boolean;
  stipend: number | null;
  startDate: string | null;
  endDate: string | null;
  isPpo: boolean;
  description: string | null;
  // Point-of-contact at the company.
  pocName: string;
  pocEmail: string;
  pocPhone: string;
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
  employmentType?: EmploymentType;
  domain?: string;
  skills?: string;
  location: string;
  isPaid?: boolean;
  stipend?: number;
  startDate?: string;
  endDate?: string;
  isPpo?: boolean;
  description?: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  certificateUrl?: string;
}

// ─── Student (self) ───
export const listMyInternships = () => api<Internship[]>('/me/internships');

export const createMyInternship = (input: InternshipInput) =>
  api<Internship>('/me/internships', { method: 'POST', body: JSON.stringify(input) });

export const updateMyInternship = (id: string, input: Partial<InternshipInput>) =>
  api<Internship>(`/me/internships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

// ─── Officer / College Admin (read-only) ───
export const listInternships = () => api<Internship[]>('/internships');
