'use client';

import type { ResumeData } from '@ellixr/shared';
import { api } from './api';

export interface MyResume {
  template: string;
  data: ResumeData;
  publicSlug: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface UpdateResumeInput {
  template?: string;
  isPublished?: boolean;
  data?: ResumeData;
}

export function getMyResume(): Promise<MyResume> {
  return api<MyResume>('/me/resume');
}

export function saveMyResume(input: UpdateResumeInput): Promise<MyResume> {
  return api<MyResume>('/me/resume', { method: 'PUT', body: JSON.stringify(input) });
}
