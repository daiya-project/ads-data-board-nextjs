/**
 * Date normalization (YYYY-MM-DD).
 * CSV/input 등 여러 형식 지원. 31-term-main: 내부·API는 YYYY-MM-DD 사용.
 */

/**
 * 날짜 문자열을 YYYY-MM-DD로 정규화.
 * 지원 형식: "2025. 12. 1", "2025-12-01", "2025/12/01", "2/14/2025"(미국형)
 * @returns 정규화된 날짜 또는 파싱 실패 시 null
 */
export function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  if (trimmed.includes("-")) {
    const parts = trimmed
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map((p) => parseInt(p, 10));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
      return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (trimmed.includes("/")) {
    const parts = trimmed
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const fourDigit = parts.find((p) => p >= 1000);
    const rest = parts.filter((p) => p < 1000);
    if (fourDigit == null || rest.length !== 2) return null;
    const month = rest[0];
    const day = rest[1];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${fourDigit}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parts = trimmed
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 기준일(endDate) 포함 최근 n일의 날짜 배열을 내림차순으로 반환.
 * 리포트 등에서 "최근 14일" 구간을 만들 때 사용. 31-term-main: YYYY-MM-DD.
 *
 * @param endDate 기준일 (YYYY-MM-DD, 배열의 첫 번째 = 가장 최근)
 * @param count 일 수 (예: 14)
 * @returns [endDate, endDate-1일, ..., endDate-(count-1)일] 또는 파싱 실패 시 []
 */
export function getRecentDateRange(endDate: string, count: number): string[] {
  if (count <= 0) return [];
  const base = new Date(endDate + "T12:00:00");
  if (Number.isNaN(base.getTime())) return [];

  const range: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    range.push(d.toISOString().slice(0, 10));
  }
  return range;
}
