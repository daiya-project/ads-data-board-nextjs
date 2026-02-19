/**
 * 주간 리포트 — 데이터 진입점 (feature lib)
 */

import { getSupabaseClientSafe } from '@shared/api';
import {
  fetchWeeklyReportData as fetchFromData,
  getWeeklyWeeks,
} from '../weekly-report-data';
import type { WeeklyReportDataResult } from '../weekly-report-data';

export { getWeeklyWeeks };
export type { WeeklyReportDataResult };

export async function fetchWeeklyReportData(): Promise<WeeklyReportDataResult | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;
  return fetchFromData(supabase);
}
