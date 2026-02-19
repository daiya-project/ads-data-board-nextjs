/**
 * Dashboard 도메인 타입
 */

export interface DailyAmountRow {
  date: string | Date;
  amount: number;
}

export interface MonthlyCumulativePoint {
  day: number;
  cumulative: number;
}

export interface MonthlyChartData {
  data: MonthlyCumulativePoint[];
  projectedData: MonthlyCumulativePoint[];
  goal: number;
  daysInMonth: number;
  lastDataDay: number;
  averageDailyRevenue: number;
}

export interface WeeklyChartItem {
  weekLabel: string;
  revenue: number;
  clientCount: number;
  weekStart: string;
}
