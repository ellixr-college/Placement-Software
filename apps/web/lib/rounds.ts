'use client';

import { api } from './api';

export type RoundOutcome = 'PENDING' | 'ADVANCED' | 'REJECTED';
export type RoundStatus = 'OPEN' | 'DECIDED';

export interface FunnelStudent {
  applicationId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  branch: string;
  email: string;
  resumeSlug: string | null;
  appliedAt: string;
  status: string;
  offerCtc: number | null;
  offerLetterUrl: string | null;
}

export interface FunnelParticipant extends FunnelStudent {
  outcome: RoundOutcome;
}

export interface FunnelRound {
  id: string;
  seq: number;
  title: string;
  scheduledAt: string | null;
  status: RoundStatus;
  overdue: boolean;
  participants: FunnelParticipant[];
}

export interface Funnel {
  applicantsTotal: number;
  inProgress: number;
  selectedCount: number;
  rejectedCount: number;
  rounds: FunnelRound[];
  pool: FunnelStudent[];
  finalists: FunnelStudent[];
  placed: FunnelStudent[];
}

export interface PendingResult {
  jobId: string;
  jobTitle: string;
  roundId: string;
  roundTitle: string;
  scheduledAt: string | null;
}

export const getFunnel = (jobId: string) => api<Funnel>(`/jobs/${jobId}/funnel`);

export const createRound = (jobId: string, input: { title?: string; scheduledAt?: string }) =>
  api(`/jobs/${jobId}/rounds`, { method: 'POST', body: JSON.stringify(input) });

export const updateRound = (
  jobId: string,
  roundId: string,
  input: { title?: string; scheduledAt?: string },
) => api(`/jobs/${jobId}/rounds/${roundId}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteRound = (jobId: string, roundId: string) =>
  api(`/jobs/${jobId}/rounds/${roundId}`, { method: 'DELETE' });

export const decideRound = (jobId: string, roundId: string, advanceIds: string[]) =>
  api(`/jobs/${jobId}/rounds/${roundId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ advanceIds }),
  });

export const placeApplicant = (
  jobId: string,
  appId: string,
  input: { offerCtc?: number; offerLetterUrl?: string },
) => api(`/jobs/${jobId}/applications/${appId}/place`, { method: 'POST', body: JSON.stringify(input) });

export const rejectApplicant = (jobId: string, appId: string, reason?: string) =>
  api(`/jobs/${jobId}/applications/${appId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });

export const listPendingResults = () => api<PendingResult[]>('/jobs/rounds/pending');
