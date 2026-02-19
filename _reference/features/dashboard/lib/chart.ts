/**
 * Dashboard 차트 렌더링
 * shared chart-utils 재사용 (Goal Monthly와 동일 스타일)
 */

import {
  renderCumulativeChart,
  renderWeeklyMixedChart,
} from '@shared/lib/chart-utils';
import type { MonthlyChartData, WeeklyChartItem } from './types';

export function renderMonthlyChart(monthlyData: MonthlyChartData): void {
  renderCumulativeChart('monthly-chart', monthlyData);
}

export function renderWeeklyChart(weeklyData: WeeklyChartItem[]): void {
  renderWeeklyMixedChart('weekly-chart', weeklyData);
}

export function renderManagerMonthlyChart(
  monthlyData: MonthlyChartData | null
): void {
  if (!monthlyData) return;
  renderCumulativeChart('manager-monthly-chart', monthlyData);
}

export function renderManagerWeeklyChart(
  weeklyData: WeeklyChartItem[]
): void {
  renderWeeklyMixedChart('manager-weekly-chart', weeklyData);
}
