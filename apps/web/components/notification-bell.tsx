'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUnreadCount } from '../lib/notifications';

/**
 * Bell icon with an unread-count badge, linking to the notifications feed.
 * Polls the count on mount and every 60s. Used in both shells via `href`.
 */
export function NotificationBell({ href, className }: { href: string; className?: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      getUnreadCount()
        .then((r) => active && setUnread(r.unread))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
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
