import ExcelJS from 'exceljs';

/** One column in a report: a row-object key and its human header. */
export interface ReportColumn {
  key: string;
  label: string;
}

/** A fully-built, format-agnostic report ready to serialize to CSV or XLSX. */
export interface ReportDataset {
  filename: string; // base name, no extension
  title: string; // sheet name / human title
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

/** Normalize a cell to a string for CSV. null/undefined → empty. */
function cell(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** RFC-4180 field escaping: quote when the value contains a comma, quote, or newline. */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serialize a dataset to a UTF-8 CSV string (BOM-prefixed so Excel reads accents). */
export function toCsv(dataset: ReportDataset): Buffer {
  const header = dataset.columns.map((c) => csvEscape(c.label)).join(',');
  const lines = dataset.rows.map((row) =>
    dataset.columns.map((c) => csvEscape(cell(row[c.key]))).join(','),
  );
  const body = [header, ...lines].join('\r\n');
  return Buffer.from('﻿' + body, 'utf8');
}

/** Serialize a dataset to an XLSX workbook buffer with a styled header row. */
export async function toXlsx(dataset: ReportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ellixr';
  wb.created = new Date();
  // Sheet names are capped at 31 chars and forbid : \ / ? * [ ].
  const sheet = wb.addWorksheet(dataset.title.slice(0, 31).replace(/[:\\/?*[\]]/g, ' '));

  sheet.columns = dataset.columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.min(40, Math.max(12, c.label.length + 2)),
  }));

  for (const row of dataset.rows) {
    // Dates serialize natively; everything else passes through.
    sheet.addRow(row);
  }

  const head = sheet.getRow(1);
  head.font = { bold: true };
  head.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0764A' } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
