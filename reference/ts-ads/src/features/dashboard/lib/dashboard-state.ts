/**
 * Dashboard 월 선택 상태 (YYYY-MM)
 */

let selectedMonth = '';
let latestMonthFromDb = '';

export function getDashboardSelectedMonth(): string {
  return selectedMonth;
}

export function setDashboardSelectedMonth(ym: string): void {
  selectedMonth = ym;
}

export function getLatestMonthFromDb(): string {
  return latestMonthFromDb;
}

export function setLatestMonthFromDb(ym: string): void {
  latestMonthFromDb = ym;
}

export function isCurrentMonthSelected(): boolean {
  return selectedMonth === latestMonthFromDb && latestMonthFromDb !== '';
}
