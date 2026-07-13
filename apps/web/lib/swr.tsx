'use client';

import { SWRConfig } from 'swr';

/**
 * Shared SWR configuration for the web app.
 * - dedupingInterval: 60s avoids duplicate requests across components and
 *   repeated page visits within a short window, which reduces DB load.
 * - revalidateOnFocus / revalidateOnReconnect: false — pages don't refetch when
 *   the user tabs back or reconnects on mobile networks. Manual `mutate()` is
 *   used after mutations.
 * - keepPreviousData: show stale data while revalidating for smoother UX.
 */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 60_000,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
