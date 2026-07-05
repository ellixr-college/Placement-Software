'use client';

import { api } from './api';

export interface PlacementMetrics {
  verifiedStudents: number;
  placedStudents: number;
  placementRate: number;
  offersCount: number;
  avgPackage: number | null;
  medianPackage: number | null;
  highestPackage: number | null;
  lowestPackage: number | null;
  placementOverTime: { month: string; count: number }[];
}

export interface JobMetrics {
  jobsPosted: number;
  jobsPublished: number;
  applicationsReceived: number;
  offersReleased: number;
  conversionRate: number;
}

export interface StudentMetrics {
  total: number;
  active: number;
  placed: number;
  unplaced: number;
  internships: number;
  completionDistribution: Record<string, number>;
}

export interface FunnelStage {
  status: string;
  count: number;
}

export interface Breakdowns {
  byBranch: { branch: string; total: number; placed: number; placementRate: number }[];
  byBatch: { graduationYear: number; total: number; placed: number; placementRate: number }[];
  byCompany: { company: string; hires: number; avgPackage: number | null }[];
}

export interface Insights {
  studentsWithMultipleOffers: number;
  multipleOfferStudents: { name: string; rollNumber: string; offers: number; bestPackage: number | null }[];
  dreamThreshold: number | null;
  dreamOffers: number;
  repeatRecruiters: { company: string; hires: number }[];
}

export const getPlacementMetrics = () => api<PlacementMetrics>('/analytics/placement');
export const getJobMetrics = () => api<JobMetrics>('/analytics/jobs');
export const getStudentMetrics = () => api<StudentMetrics>('/analytics/students');
export const getFunnel = () => api<FunnelStage[]>('/analytics/funnel');
export const getBreakdowns = () => api<Breakdowns>('/analytics/breakdowns');
export const getInsights = () => api<Insights>('/analytics/insights');
