'use client';

import { api } from './api';

export interface MyResume {
  publicSlug: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface OfficerResume extends MyResume {
  fullName: string;
}

/** Officer/admin: view any of their students' resumes. */
export function getStudentResume(studentId: string): Promise<OfficerResume> {
  return api<OfficerResume>(`/students/${studentId}/resume`);
}

export function getMyResume(): Promise<MyResume> {
  return api<MyResume>('/me/resume');
}

export function uploadMyResume(file: File): Promise<MyResume> {
  const form = new FormData();
  form.append('file', file);
  return api<MyResume>('/me/resume', { method: 'POST', body: form });
}

export function updateMyResume(input: { isPublished: boolean }): Promise<MyResume> {
  return api<MyResume>('/me/resume', { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteMyResume(): Promise<MyResume> {
  return api<MyResume>('/me/resume', { method: 'DELETE' });
}
