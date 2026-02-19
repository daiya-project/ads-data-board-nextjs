/**
 * Outbound Section - 포맷 및 날짜 유틸리티
 */

/** startDate ~ endDate(YYYY-MM-DD)를 일 단위 배열로 생성 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** "YYYY-MM-DD" → "2026년 02월 01일" */
export function formatDateKorean(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${m}월 ${d}일`;
}

/** 주간 범위 포맷: "12월 29일 ~ 1월 04일" */
export function formatWeekRangeKorean(start: string, end: string): string {
  const [, sm, sd] = start.split('-');
  const [, em, ed] = end.split('-');
  return `${parseInt(sm)}월 ${parseInt(sd)}일 ~ ${parseInt(em)}월 ${parseInt(ed)}일`;
}

/** "YYYY-MM-DD" → "YY.MM.DD" */
export function formatDateCompact(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y.slice(2)}.${m}.${d}`;
}

/** 고객사명에서 핵심 이름과 괄호 부가정보를 분리 */
export function parseClientName(raw: string): { main: string; sub: string } {
  if (!raw) return { main: '(이름 없음)', sub: '' };
  const match = raw.match(/^([^(]+)(.*)$/);
  if (!match || !match[2]) return { main: raw.trim(), sub: '' };
  const main = match[1].trim();
  const extras: string[] = [];
  const re = /\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(match[2])) !== null) {
    extras.push(m[1].trim());
  }
  return { main, sub: extras.join(' | ') };
}
