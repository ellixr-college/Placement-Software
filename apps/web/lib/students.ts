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

export interface SemesterMark {
  label: string;
  score: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  enrollmentNumber: string | null;
  course: string;
  branch: string;
  graduationYear: number;
  currentYear: number | null;
  cgpa: number | null;
  activeBacklogs: number;
  totalBacklogs: number;
  dateOfBirth: string | null;
  gender: string | null;
  personalEmail: string | null;
  linkedinUrl: string | null;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  semesterMarks: SemesterMark[] | null;
  status: string;
  verificationStatus: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  profileCompletion: number;
  resumeComplete: boolean;
  resumeMissing?: string[];
  isActive: boolean;
  createdAt: string;
  user: StudentUser;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  resumesComplete?: number;
}

export interface ExtendedProfileFields {
  dateOfBirth?: string;
  gender?: string;
  personalEmail?: string;
  linkedinUrl?: string;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  semesterMarks?: SemesterMark[];
}

export interface CreateStudentInput extends ExtendedProfileFields {
  fullName: string;
  email: string;
  rollNumber: string;
  course: string;
  branch: string;
  graduationYear: number;
  currentYear?: number;
  enrollmentNumber?: string;
  phone?: string;
  cgpa?: number;
  activeBacklogs?: number;
  totalBacklogs?: number;
}

// Batch defaults shared by every row in a CSV import.
export interface ImportDefaults {
  course?: string;
  branch?: string;
  graduationYear?: number;
  currentYear?: number;
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

export interface GraduateResult {
  graduationYear: number;
  studentsGraduated: number;
  alumniCreated: number;
  alreadyAlumni: number;
}

/** Copy a batch to Alumni and disable their logins. */
export function graduateBatch(graduationYear: number): Promise<GraduateResult> {
  return api<GraduateResult>('/students/graduate', {
    method: 'POST',
    body: JSON.stringify({ graduationYear }),
  });
}

export function createStudent(
  input: CreateStudentInput,
): Promise<{ student: Student; tempPassword: string }> {
  return api(`/students`, { method: 'POST', body: JSON.stringify(input) });
}

export function importStudents(csv: string, defaults: ImportDefaults = {}): Promise<ImportResult> {
  return api(`/students/import`, {
    method: 'POST',
    body: JSON.stringify({ csv, ...defaults }),
  });
}

export function updateStudent(id: string, input: Partial<CreateStudentInput>): Promise<Student> {
  return api<Student>(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteStudent(id: string): Promise<{ success: boolean }> {
  return api(`/students/${id}`, { method: 'DELETE' });
}

export function deleteStudents(ids: string[]): Promise<{ deleted: number }> {
  return api(`/students/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids }) });
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

export interface UpdateOwnProfileInput extends ExtendedProfileFields {
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
