/**
 * 리포트 도메인 타입 (일/주간 공통)
 */

import type { DailyReportRow } from './daily-report-data';
import type { WeeklyReportRow } from './weekly-report-data';

export type { DailyReportRow, WeeklyReportRow };
export type SortOrder = 'asc' | 'desc' | null;

export interface SortState {
  column: string;
  order: SortOrder;
}

export interface DailyStatusData {
  active: { today: DailyReportRow[]; yesterday: DailyReportRow[] };
  new: { clients: DailyReportRow[]; totalAmount: number };
  stopped: { clients: DailyReportRow[]; totalAmount: number };
  rising: { clients: DailyReportRow[]; totalAmount: number };
  falling: { clients: DailyReportRow[]; totalAmount: number };
}

export interface WeeklyStatusData {
  active: { currentWeek: WeeklyReportRow[]; previousWeek: WeeklyReportRow[] };
  new: { clients: WeeklyReportRow[]; totalAmount: number };
  stopped: { clients: WeeklyReportRow[]; totalAmount: number };
  rising: { clients: WeeklyReportRow[]; totalAmount: number };
  falling: { clients: WeeklyReportRow[]; totalAmount: number };
}

declare global {
  interface Window {
    dailyReportDataCache?: { clients: DailyReportRow[]; dateRange: string[] };
    weeklyReportDataCache?: { clients: WeeklyReportRow[]; weeks: string[] };
  }
}
