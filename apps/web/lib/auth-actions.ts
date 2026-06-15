'use client';

import { api, setAccessToken } from './api';
import type { UserRole } from '@ellixr/shared';

interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  collegeId: string | null;
  mustChangePassword?: boolean;
}

interface LoginResult {
  accessToken: string;
  user: SessionUser;
}

/**
 * Logs in and sets the readable `ellixr_role` cookie used by middleware for
 * shell routing. The httpOnly refresh cookie is managed by the API.
 */
export async function login(email: string, password: string): Promise<SessionUser> {
  const result = await api<LoginResult>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(result.accessToken);
  document.cookie = `ellixr_role=${result.user.role}; path=/; samesite=lax`;
  return result.user;
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
    document.cookie = 'ellixr_role=; path=/; max-age=0';
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await api('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ token, password }),
  });
}

/** Authenticated self-service change (used for forced first-login changes). */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
