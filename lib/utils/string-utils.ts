/**
 * String helpers (e.g. CSV → DB mapping).
 * Source: reference shared/lib/utils/format.ts (cleanClientName)
 */

/** "Daily Trend" 접미사·앞 번호 제거 후 trim */
export function cleanClientName(clientName: string): string {
  if (!clientName) return "";
  let cleaned = clientName.replace(/\s*\/\s*Daily\s+Trend\s*$/i, "");
  cleaned = cleaned.replace(/^\d+\.\s*/, "");
  cleaned = cleaned.trim();
  return cleaned;
}
