import type { DatasetRecord, MessageLabel, MessageSource, MessageTableRecord } from '../types';

/**
 * RFC-4180 compliant CSV parser handling quoted fields, escaped quotes, and CRLF/LF newlines
 */
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field.trim());
        if (row.some((cell) => cell.length > 0)) rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field.trim());
        if (row.some((cell) => cell.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeLabel(raw: string): MessageLabel | null {
  const clean = raw.trim().toLowerCase();
  if (clean === 'spam' || clean === '1' || clean === 'true') return 'Spam';
  if (clean === 'ham' || clean === 'not spam' || clean === 'legitimate' || clean === '0' || clean === 'false') return 'Ham';
  return null;
}

function normalizeSource(raw: string | undefined, text: string): MessageSource {
  if (raw) {
    const clean = raw.trim().toLowerCase();
    if (clean === 'email' || clean === 'mail') return 'Email';
    if (clean === 'sms' || clean === 'text') return 'SMS';
  }
  return text.toLowerCase().startsWith('subject:') || text.length > 180 ? 'Email' : 'SMS';
}

/**
 * Parses uploaded CSV datasets in multiple common formats:
 * - UCI SMS Spam Collection (v1, v2)
 * - 2-column (label, text) or (text, label)
 * - 3-column (source, label, text) or (id, label, text)
 */
export function parseLabeledDatasetCsv(
  csvText: string,
  startingIndex: number
): { records: DatasetRecord[]; skipped: number } {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return { records: [], skipped: 0 };

  const headerLower = rows[0].map((c) => c.toLowerCase());
  let labelCol = -1;
  let textCol = -1;
  let sourceCol = -1;
  let startRow = 0;

  // Detect header row
  const hasHeaderKeywords = headerLower.some((h) =>
    ['label', 'class', 'category', 'v1', 'spam', 'message', 'text', 'message_text', 'v2', 'content', 'source'].includes(h)
  );

  if (hasHeaderKeywords) {
    startRow = 1;
    headerLower.forEach((h, idx) => {
      if (['label', 'class', 'category', 'v1', 'target'].includes(h)) labelCol = idx;
      if (['text', 'message', 'message_text', 'v2', 'content', 'body', 'sms', 'email'].includes(h)) textCol = idx;
      if (['source', 'channel', 'type'].includes(h)) sourceCol = idx;
    });
  }

  // Fallback column inference if no standard header
  if (labelCol === -1 || textCol === -1) {
    const probe = rows[startRow] ?? rows[0];
    if (probe.length >= 3) {
      if (normalizeLabel(probe[1])) {
        sourceCol = 0;
        labelCol = 1;
        textCol = 2;
      } else if (normalizeLabel(probe[0])) {
        labelCol = 0;
        textCol = 1;
        sourceCol = 2;
      } else {
        labelCol = 0;
        textCol = 1;
      }
    } else if (probe.length === 2) {
      if (normalizeLabel(probe[0])) {
        labelCol = 0;
        textCol = 1;
      } else if (normalizeLabel(probe[1])) {
        textCol = 0;
        labelCol = 1;
      } else {
        labelCol = 0;
        textCol = 1;
      }
    }
  }

  const records: DatasetRecord[] = [];
  let skipped = 0;

  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i];
    const label = normalizeLabel(r[labelCol] ?? '');
    const text = (r[textCol] ?? '').trim();
    if (!label || text.length < 3) {
      skipped++;
      continue;
    }
    const source = normalizeSource(sourceCol >= 0 ? r[sourceCol] : undefined, text);
    records.push({
      id: `DS-${String(startingIndex + records.length + 1).padStart(3, '0')}`,
      source,
      label,
      text,
    });
  }

  return { records, skipped };
}

export function exportMessageTableCsv(records: MessageTableRecord[]): void {
  const headers = [
    'Message_ID',
    'Message_Text',
    'Source',
    'Date_Received',
    'Label',
    'Prediction_Confidence',
    'Model_Used',
  ];
  const rows = records.map((r) => [
    r.Message_ID,
    r.Message_Text,
    r.Source,
    r.Date_Received,
    r.Label,
    `${r.Prediction_Confidence.toFixed(1)}%`,
    r.Model_Used,
  ]);
  downloadCsvFile('message_table_predictions.csv', headers, rows);
}

export function exportDatasetCsv(records: DatasetRecord[]): void {
  const headers = ['ID', 'Source', 'Label', 'Message_Text'];
  const rows = records.map((r) => [r.id, r.source, r.label, r.text]);
  downloadCsvFile('spam_ham_dataset.csv', headers, rows);
}
