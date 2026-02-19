/**
 * 일별 리포트 — 데이터 진입점 (feature lib)
 */

import { getSupabaseClientSafe } from '@shared/api';
import {
  fetchDailyReportData as fetchFromData,
  getDailyDateRange,
} from '../daily-report-data';
import type { DailyReportDataResult } from '../daily-report-data';

export { getDailyDateRange };
export type { DailyReportDataResult };

export async function fetchDailyReportData(): Promise<DailyReportDataResult | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;
  return fetchFromData(supabase);
}
