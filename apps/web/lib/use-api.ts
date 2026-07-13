'use client';

import useSWR, { mutate as swrMutate } from 'swr';

export { swrMutate as mutate };

/**
 * Typed SWR hook backed by any async fetcher. The key is used for caching and
 * deduplication; set it to `null` to skip the fetch.
 *
 * Global SWR defaults (in `SwrProvider`) disable refetch-on-focus/reconnect and
 * keep a 60s dedupe window to reduce backend load. This hook adds the
 * non-retry-on-error policy.
 */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>) {
  return useSWR<T>(key, fetcher, {
    shouldRetryOnError: false,
  });
}
