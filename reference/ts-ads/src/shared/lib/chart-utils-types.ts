/**
 * Chart Utils - 타입 정의
 */

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

export interface TooltipRow {
  color: string;
  label: string;
  value: string;
}

declare const Chart: new (ctx: HTMLElement, config: unknown) => {
  destroy: () => void;
  update: (mode?: string) => void;
  resize: () => void;
  canvas: HTMLCanvasElement;
};
