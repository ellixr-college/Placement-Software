'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUnreadCount } from '../lib/notifications';

// Poll every hour. A long interval keeps DB Request-Unit usage tiny — each open
// tab otherwise queries the DB on a timer indefinitely.
const POLL_INTERVAL_MS = 60 * 60_000;

// Quiet hours (local time): no polling between 8pm and 6am.
const QUIET_START_HOUR = 20; // 8pm
const QUIET_END_HOUR = 6; // 6am
const inQuietHours = () => {
  const h = new Date().getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
};

/**
 * Bell icon with an unread-count badge, linking to the notifications feed.
 * Polls the count on mount, then hourly — but skips the poll while the tab is
 * hidden or during quiet hours (8pm–6am), so it barely touches the database.
 */
export function NotificationBell({ href, className }: { href: string; className?: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (inQuietHours()) return;
      getUnreadCount()
        .then((r) => active && setUnread(r.unread))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      className={
        className ??
        'relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-app'
      }
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
