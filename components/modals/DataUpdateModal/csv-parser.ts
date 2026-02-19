/**
 * CSV parsing — parseCSV, CSVRecord.
 * 날짜 정규화는 @/lib/utils (normalizeDate) 사용.
 * Source: reference shared/lib/csv-parser.ts
 */

export interface CSVRecord {
  [key: string]: string;
}

/**
 * CSV 파싱 함수
 */
export function parseCSV(csvText: string): CSVRecord[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const records: CSVRecord[] = [];
  const skippedByCols: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length === headers.length) {
      const record: CSVRecord = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? "";
      });
      records.push(record);
    } else {
      skippedByCols.push(i + 1);
    }
  }
  if (skippedByCols.length > 0 && process.env.NODE_ENV === "development") {
    console.log(
      `[CSV] 컬럼 수 불일치로 스킵된 행(1-based): ${skippedByCols.slice(0, 20).join(", ")}${skippedByCols.length > 20 ? ` 외 ${skippedByCols.length - 20}행` : ""} (헤더=${headers.length}개)`,
    );
  }
  return records;
}
