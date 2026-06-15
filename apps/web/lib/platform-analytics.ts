'use client';

import { api } from './api';

export interface PlatformOverview {
  colleges: number;
  activeColleges: number;
  students: number;
  verifiedStudents: number;
  placedStudents: number;
  jobs: number;
  platformJobs: number;
  applications: number;
  offers: number;
  placementRate: number;
  studentsByCollege: { collegeId: string; name: string; students: number }[];
  placementsByBatch: { graduationYear: number; placements: number }[];
}

export const getPlatformOverview = () => api<PlatformOverview>('/platform/analytics/overview');
