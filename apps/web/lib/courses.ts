'use client';

import { api } from './api';

export interface CollegeCourse {
  id: string;
  collegeId: string;
  name: string;
  branches: string[];
}

export interface CourseInput {
  name?: string;
  branches?: string[];
}

// ─── Tenant (College Admin / Officer): own college catalog for forms ───
export const listMyCourses = () => api<CollegeCourse[]>('/courses');

// ─── Platform Admin: manage a college's catalog ───
export const listCollegeCourses = (collegeId: string) =>
  api<CollegeCourse[]>(`/colleges/${collegeId}/courses`);

export const createCollegeCourse = (collegeId: string, input: CourseInput) =>
  api<CollegeCourse>(`/colleges/${collegeId}/courses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCollegeCourse = (collegeId: string, id: string, input: CourseInput) =>
  api<CollegeCourse>(`/colleges/${collegeId}/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteCollegeCourse = (collegeId: string, id: string) =>
  api<{ success: boolean }>(`/colleges/${collegeId}/courses/${id}`, { method: 'DELETE' });
