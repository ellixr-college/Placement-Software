'use client';

import { api } from './api';

export const TRAINING_CATEGORIES = [
  'SOFT_SKILLS',
  'APTITUDE',
  'TECHNICAL',
  'MOCK_INTERVIEW',
  'GROUP_DISCUSSION',
  'OTHER',
] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const COMPLETION_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export interface TrainingProgram {
  id: string;
  collegeId: string;
  name: string;
  category: TrainingCategory;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: { records: number };
}

export interface ProgramInput {
  name?: string;
  category?: TrainingCategory;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface TrainingRecordRow {
  id: string;
  programId: string;
  programName: string;
  category: TrainingCategory;
  attendancePercent: number | null;
  completionStatus: CompletionStatus;
  score: number | null;
}

export interface EmployabilitySummary {
  scores: {
    aptitude: number | null;
    communication: number | null;
    interview: number | null;
  };
  readiness: number | null;
  records: TrainingRecordRow[];
}

export interface RecordInput {
  studentId: string;
  programId: string;
  attendancePercent?: number;
  completionStatus?: CompletionStatus;
  score?: number;
}

export interface ScoresInput {
  aptitudeScore?: number;
  communicationScore?: number;
  interviewScore?: number;
}

// ─── Officer / College Admin ───
export const listPrograms = () => api<TrainingProgram[]>('/training/programs');

export const createProgram = (input: ProgramInput) =>
  api<TrainingProgram>('/training/programs', { method: 'POST', body: JSON.stringify(input) });

export const updateProgram = (id: string, input: ProgramInput) =>
  api<TrainingProgram>(`/training/programs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteProgram = (id: string) =>
  api<{ success: boolean }>(`/training/programs/${id}`, { method: 'DELETE' });

export const upsertRecord = (input: RecordInput) =>
  api<TrainingRecordRow>('/training/records', { method: 'POST', body: JSON.stringify(input) });

export const deleteRecord = (id: string) =>
  api<{ success: boolean }>(`/training/records/${id}`, { method: 'DELETE' });

export const updateStudentScores = (studentId: string, input: ScoresInput) =>
  api<EmployabilitySummary>(`/training/students/${studentId}/scores`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const getStudentEmployability = (studentId: string) =>
  api<EmployabilitySummary>(`/training/students/${studentId}/employability`);

// ─── Student (self) ───
export const getMyEmployability = () => api<EmployabilitySummary>('/me/training');

export const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  SOFT_SKILLS: 'Soft Skills',
  APTITUDE: 'Aptitude',
  TECHNICAL: 'Technical',
  MOCK_INTERVIEW: 'Mock Interview',
  GROUP_DISCUSSION: 'Group Discussion',
  OTHER: 'Other',
};

export const STATUS_LABELS: Record<CompletionStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
