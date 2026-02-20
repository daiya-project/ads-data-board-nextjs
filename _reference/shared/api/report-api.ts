/**
 * Report API — Supabase 전용 쿼리 (Daily/Weekly)
 * 비즈니스·클라이언트맵·비교값은 components/reports에서 처리.
 */

import type { SupabaseClient } from '@shared/types';

const PAGE_SIZE = 1000;
const PARALLEL_PAGES = 4;

/** ads_data_daily 최신 date 1건 */
export async function fetchLastReportDate(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error && (error as { code?: string }).code !== 'PGRST116') {
    throw new Error(`마지막 날짜 조회 오류: ${(error as Error).message}`);
  }
  return data && (data as { date?: string }).date ? (data as { date: string }).date : null;
}

/** shared_holiday에서 해당 날짜 목록 */
export async function fetchHolidaysInRange(
  supabase: SupabaseClient,
  dateRange: string[]
): Promise<Set<string>> {
  const { data } = await supabase
    .from('shared_holiday')
    .select('holiday_date')
    .in('holiday_date', dateRange);
  const holidays = new Set<string>();
  if (data) {
    for (const row of data as { holiday_date: string | Date }[]) {
      const dateStr =
        row.holiday_date instanceof Date
          ? row.holiday_date.toISOString().split('T')[0]
          : String(row.holiday_date).split('T')[0];
      holidays.add(dateStr);
    }
  }
  return holidays;
}

export interface DailyRawRow {
  client_id: number;
  client_name: string;
  manager_id: number | null;
  date: string;
  revenue: number;
}

/** 일별 리포트용 ads_data_daily 페이지네이션 + 병렬 조회 */
export async function fetchDailyReportRows(
  supabase: SupabaseClient,
  dateRange: string[]
): Promise<DailyRawRow[]> {
  const allRows: DailyRawRow[] = [];
  let offset = 0;
  for (;;) {
    const promises: Promise<{ data: DailyRawRow[] | null; error: unknown }>[] = [];
    for (let i = 0; i < PARALLEL_PAGES; i++) {
      const from = offset + i * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const promise = (supabase
        .from('ads_data_daily')
        .select('client_id, client_name, manager_id, date, revenue')
        .in('date', dateRange)
        .order('client_id', { ascending: true })
        .order('date', { ascending: false }) as { range: (a: number, b: number) => Promise<{ data: DailyRawRow[] | null; error: unknown }> }).range(from, to);
      promises.push(promise);
    }
    const results = await Promise.all(promises);
    let hasMore = false;
    for (const res of results) {
      if (res.error) throw new Error(`데이터 조회 오류: ${(res.error as Error).message}`);
      const rows = res.data ?? [];
      allRows.push(...rows);
      if (rows.length >= PAGE_SIZE) hasMore = true;
    }
    if (!hasMore) break;
    offset += PARALLEL_PAGES * PAGE_SIZE;
  }
  return allRows;
}

export interface WeeklyRawRow {
  client_id: number;
  client_name: string;
  manager_id: number | null;
  week_start: string;
  week_end?: string;
  weekly_amount: number;
}

/** 주간 리포트용 ads_data_v_weekly 조회 */
export async function fetchWeeklyReportRows(supabase: SupabaseClient): Promise<WeeklyRawRow[]> {
  const { data, error } = await supabase
    .from('ads_data_v_weekly')
    .select('client_id, client_name, manager_id, week_start, week_end, weekly_amount')
    .order('week_start', { ascending: false })
    .order('client_id', { ascending: true })
    .limit(10000);
  if (error) throw new Error(`주간 데이터 조회 오류: ${(error as Error).message}`);
  return (data ?? []) as WeeklyRawRow[];
}
