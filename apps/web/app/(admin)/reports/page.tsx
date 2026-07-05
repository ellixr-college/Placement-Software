'use client';

import { useEffect, useState } from 'react';
import { Button, Card, SectionCard } from '@ellixr/ui';
import { downloadReport, getReportCatalog, REPORT_LABELS, type ReportFormat } from '../../../lib/reports';
import { getPlacementMetrics, type PlacementMetrics } from '../../../lib/analytics';

const DESCRIPTIONS: Record<string, string> = {
  students: 'Full student directory with academics, verification & profile status.',
  companies: 'Recruiting companies, jobs posted & primary contacts.',
  placement: 'One row per placed student — company, role & CTC.',
  offers: 'Every released, accepted & joined offer.',
  branch: 'Branch-wise placement rate, offers & average package.',
  funnel: 'Application counts by outcome status.',
};

function fmtMonth(m: string): string {
  const d = new Date(/^\d{4}-\d{2}$/.test(m) ? `${m}-01` : m);
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString(undefined, { month: 'short' });
}

export default function ReportsPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [placement, setPlacement] = useState<PlacementMetrics | null>(null);
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [catalog, pm] = await Promise.all([getReportCatalog(), getPlacementMetrics()]);
        setTypes(catalog.reportTypes);
        setPlacement(pm);
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

  const series = placement?.placementOverTime ?? [];
  const max = Math.max(1, ...series.map((s) => s.count));
  const totalPlaced = series.reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Insights &amp; reports</h1>
        <p className="text-sm text-subtle">Month-on-month placement trend, plus data exports.</p>
      </header>

      {error && <div className="rounded-card bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* Month-on-month placements */}
      <SectionCard
        title="Placements — month on month"
        subtitle={`${totalPlaced} in the last ${series.length} month${series.length === 1 ? '' : 's'}`}
      >
        {series.length === 0 ? (
          <p className="text-sm text-subtle">No placements recorded yet.</p>
        ) : (
          <div className="flex h-44 items-end gap-2">
            {series.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-strong">{m.count}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-primary transition-all"
                  style={{ height: `${Math.max(3, (m.count / max) * 100)}%` }}
                  title={`${fmtMonth(m.month)}: ${m.count}`}
                />
                <span className="text-[10px] text-subtle">{fmtMonth(m.month)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Data exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-strong">Download data</h2>
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <Card key={type} className="flex flex-col justify-between gap-4 p-5">
            <div>
              <h3 className="text-base font-semibold text-strong">{REPORT_LABELS[type] ?? type}</h3>
              <p className="mt-1 text-xs text-subtle">{DESCRIPTIONS[type] ?? ''}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownload(type)} loading={busy === type}>
              {busy === type ? 'Preparing…' : `Download ${format.toUpperCase()}`}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
