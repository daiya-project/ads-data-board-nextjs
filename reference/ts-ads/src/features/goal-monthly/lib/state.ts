/**
 * Goal Monthly Feature — 상태
 */

export interface MonthlyViewState {
  selectedMonth: string;
  selectedManagerId: number | null;
}

function getDefaultMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export const state: MonthlyViewState = {
  selectedMonth: getDefaultMonth(),
  selectedManagerId: null,
};
