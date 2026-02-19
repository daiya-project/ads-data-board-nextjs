/**
 * CSV Uploader - CSV 파싱
 */

export interface CSVRecord {
  [key: string]: string;
}

/**
 * CSV 파싱 함수
 */
export function parseCSV(csvText: string): CSVRecord[] {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const records: CSVRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length === headers.length) {
      const record: CSVRecord = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });
      records.push(record);
    }
  }
  return records;
}

/**
 * 날짜 파싱 — 여러 형식 지원
 *   "2025. 12. 1"  → "2025-12-01"
 *   "2025-12-01"   → "2025-12-01"
 *   "2025/12/01"   → "2025-12-01"
 */
export function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map((p) => parseInt(p, 10));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map((p) => parseInt(p, 10));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parts = trimmed.split('.').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
