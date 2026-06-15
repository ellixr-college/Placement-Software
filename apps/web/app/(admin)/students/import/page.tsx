'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@ellixr/ui';
import { importStudents, type ImportResult } from '../../../../lib/students';

const TEMPLATE =
  'rollNumber,fullName,email,course,branch,graduationYear,cgpa,activeBacklogs,phone\n' +
  '21CS001,Asha Rao,asha@college.edu,B.Tech,CSE,2027,8.4,0,9876543210';

export default function ImportStudentsPage() {
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function onImport() {
    setError(null);
    setResult(null);
    if (!csv.trim()) {
      setError('Paste CSV content or choose a file first.');
      return;
    }
    setLoading(true);
    try {
      setResult(await importStudents(csv));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  function downloadCredentials() {
    if (!result) return;
    const rows = ['rollNumber,fullName,email,tempPassword'].concat(
      result.created.map((c) => `${c.rollNumber},${c.fullName},${c.email},${c.tempPassword}`),
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Import students</h1>
        <Link href="/students" className="text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-strong">CSV format</p>
          <p className="text-xs text-subtle">
            First row must be the header. Required columns: rollNumber, fullName, email, course,
            branch, graduationYear. Optional: cgpa, activeBacklogs, totalBacklogs, enrollmentNumber,
            phone.
          </p>
          <pre className="overflow-x-auto rounded-md bg-app p-3 text-xs text-strong">{TEMPLATE}</pre>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Choose file…
          </Button>
          <Button variant="ghost" onClick={() => setCsv(TEMPLATE)}>
            Use template
          </Button>
        </div>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder="Paste CSV here…"
          className="w-full rounded-md border border-border bg-white p-3 font-mono text-xs outline-none focus:border-primary-400"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button size="lg" onClick={onImport} disabled={loading}>
          {loading ? 'Importing…' : 'Import students'}
        </Button>
      </Card>

      {result && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-success">{result.createdCount} created</span>
            {result.errorCount > 0 && (
              <span className="text-sm text-danger">{result.errorCount} failed</span>
            )}
          </div>

          {result.created.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-strong">Temporary passwords</p>
                <Button variant="ghost" size="sm" onClick={downloadCredentials}>
                  Download CSV
                </Button>
              </div>
              <p className="text-xs text-subtle">
                Shown once. Students set their own password on first login.
              </p>
              <div className="max-h-60 overflow-y-auto rounded-md bg-app p-3">
                <table className="w-full text-left text-xs">
                  <thead className="text-subtle">
                    <tr>
                      <th className="py-1 pr-4 font-medium">Roll No.</th>
                      <th className="py-1 pr-4 font-medium">Email</th>
                      <th className="py-1 font-medium">Temp password</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-strong">
                    {result.created.map((c) => (
                      <tr key={c.rollNumber}>
                        <td className="py-1 pr-4">{c.rollNumber}</td>
                        <td className="py-1 pr-4">{c.email}</td>
                        <td className="py-1">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-danger">Errors</p>
              <ul className="space-y-1 text-xs text-subtle">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/students">
            <Button variant="ghost">Done</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
