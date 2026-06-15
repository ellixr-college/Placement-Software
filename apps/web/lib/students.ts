'use client';

import { api, apiList } from './api';

export interface StudentUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface Student {
  id: string;
  rollNumber: string;
  enrollmentNumber: string | null;
  course: string;
  branch: string;
  graduationYear: number;
  cgpa: number | null;
  activeBacklogs: number;
  totalBacklogs: number;
  status: string;
  verificationStatus: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  profileCompletion: number;
  isActive: boolean;
  createdAt: string;
  user: StudentUser;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateStudentInput {
  fullName: string;
  email: string;
  rollNumber: string;
  course: string;
  branch: string;
  graduationYear: number;
  enrollmentNumber?: string;
  phone?: string;
  cgpa?: number;
  activeBacklogs?: number;
  totalBacklogs?: number;
}

export interface ImportResult {
  createdCount: number;
  errorCount: number;
  created: Array<{ rollNumber: string; fullName: string; email: string; tempPassword: string }>;
  errors: Array<{ row: number; message: string }>;
}

export interface ListParams {
  search?: string;
  branch?: string;
  graduationYear?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listStudents(
  params: ListParams = {},
): Promise<{ items: Student[]; meta?: ListMeta }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString();
  const { data, meta } = await apiList<Student[]>(`/students${query ? `?${query}` : ''}`);
  return { items: data, meta };
}

export function getStudent(id: string): Promise<Student> {
  return api<Student>(`/students/${id}`);
}

export function createStudent(
  input: CreateStudentInput,
): Promise<{ student: Student; tempPassword: string }> {
  return api(`/students`, { method: 'POST', body: JSON.stringify(input) });
}

export function importStudents(csv: string): Promise<ImportResult> {
  return api(`/students/import`, { method: 'POST', body: JSON.stringify({ csv }) });
}

export function setStudentActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; isActive: boolean }> {
  return api(`/students/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export function verifyStudent(
  id: string,
  action: 'verify' | 'reject',
  reason?: string,
): Promise<Student> {
  return api(`/students/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
  });
}

// ─────────────── Student self-service ───────────────

export interface UpdateOwnProfileInput {
  fullName?: string;
  phone?: string;
  enrollmentNumber?: string;
  course?: string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
  activeBacklogs?: number;
  totalBacklogs?: number;
}

export function getOwnStudent(): Promise<Student> {
  return api<Student>(`/me/student`);
}

export function updateOwnProfile(input: UpdateOwnProfileInput): Promise<Student> {
  return api(`/me/student/profile`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function submitOwnProfile(): Promise<Student> {
  return api(`/me/student/submit`, { method: 'POST' });
}
