'use client';

import { api } from './api';

export interface InterviewRound {
  id: string;
  roundName: string;
  scheduledAt: string | null;
  mode: string | null;
  location: string | null;
  result: string;
  feedback: string | null;
}

export interface StageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  note: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  stage: string;
  appliedAt: string;
  rejectionReason: string | null;
  offerCtc: number | null;
  notes: string | null;
  job: {
    id: string;
    title: string;
    jobType: string;
    location: string | null;
    company: { id: string; name: string; logoUrl: string | null };
  };
  interviews: InterviewRound[];
  stageHistory: StageHistoryEntry[];
  student?: { id: string; rollNumber: string; fullName: string; branch: string };
}

export interface PipelineEntry {
  id: string;
  stage: string;
  appliedAt: string;
  offerCtc: number | null;
  student: { id: string; rollNumber: string; fullName: string; branch: string; cgpa: number | null };
}

export const ATS_STAGES = [
  'APPLIED',
  'VERIFIED',
  'SHORTLISTED',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'HR',
  'OFFER_RELEASED',
  'OFFER_ACCEPTED',
  'JOINED',
] as const;

// ─── Student ───
export function listMyApplications(): Promise<Application[]> {
  return api<Application[]>(`/me/applications`);
}

export function withdrawApplication(id: string): Promise<{ id: string }> {
  return api(`/me/applications/${id}/withdraw`, { method: 'POST' });
}

// ─── Placement Officer ───
export function getPipeline(jobId: string): Promise<PipelineEntry[]> {
  return api<PipelineEntry[]>(`/jobs/${jobId}/applications`);
}

export function getApplication(id: string): Promise<Application> {
  return api<Application>(`/applications/${id}`);
}

export function changeStage(
  id: string,
  input: { stage: string; note?: string; rejectionReason?: string; offerCtc?: number },
): Promise<Application> {
  return api(`/applications/${id}/stage`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function addInterview(
  id: string,
  input: { roundName: string; scheduledAt?: string; mode?: string; location?: string; result?: string; feedback?: string },
): Promise<InterviewRound> {
  return api(`/applications/${id}/interviews`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateInterview(
  id: string,
  roundId: string,
  input: { result?: string; feedback?: string; scheduledAt?: string; mode?: string; location?: string },
): Promise<InterviewRound> {
  return api(`/applications/${id}/interviews/${roundId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
