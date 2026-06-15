'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ellixr/ui';
import {
  downloadReport,
  getReportCatalog,
  REPORT_LABELS,
  type ReportFormat,
} from '../../../lib/reports';

const DESCRIPTIONS: Record<string, string> = {
  students: 'Full student directory with academics, verification & profile status.',
  companies: 'Recruiting companies, jobs posted & primary contacts.',
  placement: 'One row per placed student — company, role & CTC.',
  offers: 'Every released, accepted & joined offer.',
  branch: 'Branch-wise placement rate, offers & average package.',
  funnel: 'Application counts across every ATS stage.',
};

export default function ReportsPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const catalog = await getReportCatalog();
        setTypes(catalog.reportTypes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDownload(type: string) {
    setError(null);
    setBusy(type);
    try {
      await downloadReport(type, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-subtle">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Reports</h1>
          <p className="text-sm text-subtle">
            Export your college&apos;s data. Files download directly — nothing is stored.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-pill border border-border bg-white p-1 shadow-card">
          {(['csv', 'xlsx'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={
                'rounded-pill px-4 py-1.5 text-sm font-medium transition ' +
                (format === f ? 'bg-gradient-primary text-white' : 'text-subtle hover:text-strong')
              }
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="rounded-card bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <Card key={type} className="flex flex-col justify-between gap-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-strong">
                {REPORT_LABELS[type] ?? type}
              </h2>
              <p className="mt-1 text-xs text-subtle">{DESCRIPTIONS[type] ?? ''}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(type)}
              loading={busy === type}
            >
              {busy === type ? 'Preparing…' : `Download ${format.toUpperCase()}`}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
