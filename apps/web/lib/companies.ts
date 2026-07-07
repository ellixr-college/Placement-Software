'use client';

import { api, apiList } from './api';

export interface CompanyContact {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  contacts: CompanyContact[];
  _count?: { jobs: number };
}

export interface HiringHistoryItem {
  id: string;
  title: string;
  status: string;
  jobType: string;
  createdAt: string;
  applicationCount: number;
  hiredCount: number;
}

export async function listCompanies(search = ''): Promise<Company[]> {
  const { data } = await apiList<Company[]>(
    `/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`,
  );
  return data;
}

export function getCompany(id: string): Promise<Company> {
  return api<Company>(`/companies/${id}`);
}

export function createCompany(input: {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  city?: string;
  // Optional primary POC (recruiter contact) created with the company.
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactDesignation?: string;
}): Promise<Company> {
  return api(`/companies`, { method: 'POST', body: JSON.stringify(input) });
}

export interface RecruiterTrackingRow {
  userId: string;
  fullName: string;
  role: string;
  recruiters: number;
}

/** College Head only: recruiters registered per team member. */
export function getRecruiterTracking(): Promise<RecruiterTrackingRow[]> {
  return api<RecruiterTrackingRow[]>(`/companies/recruiter-tracking`);
}

export function getHiringHistory(id: string): Promise<HiringHistoryItem[]> {
  return api<HiringHistoryItem[]>(`/companies/${id}/hiring-history`);
}

export function addContact(
  companyId: string,
  input: { name: string; email: string; designation?: string; phone?: string; isPrimary?: boolean },
): Promise<CompanyContact> {
  return api(`/companies/${companyId}/contacts`, { method: 'POST', body: JSON.stringify(input) });
}

export function removeContact(companyId: string, contactId: string): Promise<{ success: boolean }> {
  return api(`/companies/${companyId}/contacts/${contactId}`, { method: 'DELETE' });
}
