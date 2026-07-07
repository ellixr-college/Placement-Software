'use client';

import { api } from './api';

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: string; // COLLEGE_ADMIN | PLACEMENT_OFFICER
  phone?: string;
  // Optional: set the password directly. Omit to auto-generate a temp password.
  password?: string;
}

export interface CreateUserResult {
  user: TeamMember;
  passwordGenerated: boolean;
  tempPassword: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

export const listUsers = () => api<TeamMember[]>('/users');

export const createUser = (input: CreateUserInput) =>
  api<CreateUserResult>('/users', { method: 'POST', body: JSON.stringify(input) });

export const updateUser = (id: string, input: UpdateUserInput) =>
  api<TeamMember>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deactivateUser = (id: string) =>
  api<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });

export const reactivateUser = (id: string) => updateUser(id, { isActive: true });
