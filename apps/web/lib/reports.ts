'use client';

import { api, API_URL, getAccessToken, setAccessToken } from './api';

export type ReportFormat = 'csv' | 'xlsx';

export interface ReportCatalog {
  reportTypes: string[];
  formats: ReportFormat[];
}

/** Human labels for the report type keys the API exposes. */
export const REPORT_LABELS: Record<string, string> = {
  students: 'Students',
  companies: 'Companies',
  placement: 'Placement',
  offers: 'Offers',
  branch: 'Branch Summary',
  funnel: 'Application Funnel',
};

export const getReportCatalog = () => api<ReportCatalog>('/reports');

/** Exchange the refresh cookie for a fresh access token (mirrors lib/api). */
async function refresh(): Promise<boolean> {
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
    setAccessToken(token);
    return true;
  } catch {
    return false;
  }
}

/** Pull a filename out of a Content-Disposition header, if present. */
function filenameFrom(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

/**
 * POSTs to the report export endpoint and triggers a browser download of the
 * returned file. Streams binary, so it can't use the JSON `api` wrapper; it
 * still honours the same bearer-token + one-shot refresh-on-401 flow.
 */
export async function downloadReport(
  type: string,
  format: ReportFormat,
  retry = false,
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/reports/${type}/export?format=${format}`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401 && !retry) {
    if (await refresh()) return downloadReport(type, format, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const filename = filenameFrom(res.headers.get('Content-Disposition'), `${type}.${format}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
