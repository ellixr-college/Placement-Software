'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@ellixr/ui';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType,
} from '../lib/notifications';

const ICON: Record<NotificationType, string> = {
  PROFILE_SUBMITTED: '📝',
  PROFILE_VERIFIED: '✅',
  PROFILE_REJECTED: '⚠️',
  APPLICATION_STAGE_CHANGED: '📋',
  OFFER_RELEASED: '🎉',
  INTERVIEW_SCHEDULED: '📅',
  GENERAL: '🔔',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function NotificationsFeed() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await listNotifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  async function open(n: AppNotification) {
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    await markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Notifications</h1>
          <p className="text-sm text-subtle">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm font-medium text-primary-600 hover:underline">
            Mark all read
          </button>
        )}
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-subtle">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No notifications yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              onClick={() => open(n)}
              className={
                'flex cursor-pointer items-start gap-3 p-4 transition hover:shadow-nav ' +
                (n.readAt ? 'opacity-70' : 'border-l-4 border-l-primary-400')
              }
            >
              <span className="text-lg leading-none">{ICON[n.type] ?? '🔔'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-strong">{n.title}</p>
                  <span className="shrink-0 text-xs text-subtle">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-subtle">{n.body}</p>}
              </div>
              {!n.readAt && (
                <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-primary-500" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
