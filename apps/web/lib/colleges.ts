'use client';

import { api, apiList } from './api';

export interface College {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  contactEmail: string;
  contactPhone: string | null;
  city: string | null;
  state: string | null;
  country: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollegeInput {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  state?: string;
  // Initial College Admin (super-admin for the tenant)
  adminFullName: string;
  adminEmail: string;
  // Optional: set the admin's password directly. Omit to auto-generate one.
  adminPassword?: string;
}

export interface CreateCollegeResult {
  college: College;
  // True when the server generated the password (admin left it blank).
  passwordGenerated: boolean;
  // Present only when passwordGenerated is true.
  adminTempPassword: string | null;
}

export async function listColleges(search?: string): Promise<College[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data } = await apiList<College[]>(`/colleges${qs}`);
  return data;
}

export const createCollege = (input: CreateCollegeInput) =>
  api<CreateCollegeResult>('/colleges', { method: 'POST', body: JSON.stringify(input) });

export const setCollegeStatus = (id: string, isActive: boolean) =>
  api<College>(`/colleges/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
