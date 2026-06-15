'use client';

import { api } from './api';

export type NotificationType =
  | 'PROFILE_SUBMITTED'
  | 'PROFILE_VERIFIED'
  | 'PROFILE_REJECTED'
  | 'APPLICATION_STAGE_CHANGED'
  | 'OFFER_RELEASED'
  | 'INTERVIEW_SCHEDULED'
  | 'GENERAL';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function listNotifications(unreadOnly = false): Promise<AppNotification[]> {
  return api<AppNotification[]>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
}

export function getUnreadCount(): Promise<{ unread: number }> {
  return api<{ unread: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<{ success: boolean }> {
  return api(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead(): Promise<{ success: boolean; marked: number }> {
  return api('/notifications/read-all', { method: 'POST' });
}
