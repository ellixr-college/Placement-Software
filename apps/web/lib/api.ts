// The browser talks to the same-origin BFF proxy by default ("/api/v1").
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

export interface ApiOptions extends RequestInit {
  /** Attach the bearer access token (default true). */
  auth?: boolean;
}

// Refresh tokens are single-use and rotate on every call. If two requests try to
// refresh at once (e.g. the session bootstrap + a page's first data fetch on a
// hard load), the second would present an already-rotated cookie and fail — and
// could even log the user out. Dedupe: concurrent callers share ONE refresh.
let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => ({}));
    const token: string | undefined = body?.data?.accessToken;
    if (!token) return false;
    accessToken = token;
    return true;
  } catch {
    return false;
  }
}

/** Exchange the httpOnly refresh cookie for a fresh access token (deduped). */
export function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Thin fetch wrapper that unwraps the API's { data } | { error } envelope. */
export async function api<T>(path: string, options: ApiOptions = {}, _retry = false): Promise<T> {
  const { auth = true, headers, body: requestBody, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && requestBody instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    body: requestBody,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  // Access tokens are short-lived (~15m). On expiry, refresh once and retry.
  if (res.status === 401 && auth && !_retry && path !== '/auth/refresh') {
    if (await tryRefresh()) return api<T>(path, options, true);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body.data as T;
}

/**
 * Like `api`, but returns the full `{ data, meta }` envelope — for paginated
 * list endpoints that carry pagination in `meta`.
 */
export async function apiList<T>(
  path: string,
  options: ApiOptions = {},
  _retry = false,
): Promise<{ data: T; meta?: { total: number; page: number; limit: number; pages: number } }> {
  const { auth = true, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && auth && !_retry && path !== '/auth/refresh') {
    if (await tryRefresh()) return apiList<T>(path, options, true);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return { data: body.data as T, meta: body.meta };
}

export { API_URL };
