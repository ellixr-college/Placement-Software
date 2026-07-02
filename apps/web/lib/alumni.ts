'use client';

import { api, apiList } from './api';

export interface Alumni {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  registerNumber: string | null;
  graduationYear: number;
  course: string | null;
  branch: string;
  currentCompany: string | null;
  currentDesignation: string | null;
  currentLocation: string | null;
  linkedinUrl: string | null;
  isMentor: boolean;
  isHiring: boolean;
  tags: string[];
  notes: string | null;
  selfRegistered: boolean;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniInput {
  fullName: string;
  email: string;
  graduationYear: number;
  branch: string;
  phone?: string;
  registerNumber?: string;
  course?: string;
  currentCompany?: string;
  currentDesignation?: string;
  currentLocation?: string;
  linkedinUrl?: string;
  isMentor?: boolean;
  isHiring?: boolean;
  tags?: string[];
  notes?: string;
}

export interface AlumniStats {
  total: number;
  mentors: number;
  hiring: number;
  byGraduationYear: { graduationYear: number; count: number }[];
  byBranch: { branch: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  facets: { branches: string[]; graduationYears: number[]; companies: string[] };
}

export interface AlumniFilters {
  search?: string;
  branch?: string;
  graduationYear?: number;
  company?: string;
  tag?: string;
  isMentor?: boolean;
  isHiring?: boolean;
  pending?: boolean;
  page?: number;
  limit?: number;
}

// Public self-registration (no curation flags).
export interface SelfRegisterInput {
  fullName: string;
  email: string;
  graduationYear: number;
  branch: string;
  phone?: string;
  registerNumber?: string;
  course?: string;
  currentCompany?: string;
  currentDesignation?: string;
  currentLocation?: string;
  linkedinUrl?: string;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listAlumni(
  filters: AlumniFilters = {},
): Promise<{ items: Alumni[]; meta?: ListMeta }> {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString();
  const { data, meta } = await apiList<Alumni[]>(`/alumni${query ? `?${query}` : ''}`);
  return { items: data, meta };
}

export const getAlumni = (id: string) => api<Alumni>(`/alumni/${id}`);
export const getAlumniStats = () => api<AlumniStats>('/alumni/stats');

export const createAlumni = (input: AlumniInput) =>
  api<Alumni>('/alumni', { method: 'POST', body: JSON.stringify(input) });

export const updateAlumni = (id: string, input: Partial<AlumniInput> & { isActive?: boolean }) =>
  api<Alumni>(`/alumni/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteAlumni = (id: string) =>
  api<{ success: boolean }>(`/alumni/${id}`, { method: 'DELETE' });

export const approveAlumni = (id: string) =>
  api<Alumni>(`/alumni/${id}/approve`, { method: 'POST' });

// ─── Public self-registration portal (no auth) ───
export const getPublicCollege = (slug: string) =>
  api<{ name: string; slug: string }>(`/public/alumni/${slug}`, { auth: false });

export const selfRegisterAlumni = (slug: string, input: SelfRegisterInput) =>
  api<{ success: boolean }>(`/public/alumni/${slug}/register`, {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  });
