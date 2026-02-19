/**
 * Dashboard API — Supabase 전용 쿼리
 * 비즈니스/차트 로직은 features/dashboard/lib에서 처리.
 */

import type { SupabaseClient } from '@shared/types';

const PAGE_SIZE = 1000;

/** ads_data_daily 최신 1건 조회 후 YYYY-MM 반환 */
export async function getDefaultSelectedMonth(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('ads_data_daily')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error || !data || !(data as { date?: string }).date) {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }
  const d = new Date((data as { date: string }).date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface DailyAmountRow {
  date: string;
  amount: number;
}

/** 월별 일 단위 날짜 배열 기준 ads_data_daily 페이지네이션 조회 */
export async function fetchDailyInMonthRange(
  supabase: SupabaseClient,
  dateRange: string[],
  managerId: number | null
): Promise<DailyAmountRow[]> {
  const dailyData: DailyAmountRow[] = [];
  let hasMore = true;
  let page = 0;
  let query = supabase
    .from('ads_data_daily')
    .select('date, amount')
    .in('date', dateRange)
    .order('date', { ascending: true });
  if (managerId != null) {
    query = query.eq('manager_id', managerId) as ReturnType<SupabaseClient['from']>;
  }
  while (hasMore) {
    const { data: pageData, error } = await (query as { range: (a: number, b: number) => Promise<{ data: DailyAmountRow[] | null; error: unknown }> }).range(
      page * PAGE_SIZE,
      (page + 1) * PAGE_SIZE - 1
    );
    if (error) throw new Error(`일별 매출 조회 오류: ${(error as Error).message}`);
    const rows = pageData ?? [];
    if (rows.length > 0) {
      dailyData.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }
  return dailyData;
}

/** 해당 월 팀/매니저 목표(goal_revenue) 1건 */
export async function fetchTeamGoalForMonth(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  managerId: number | null
): Promise<number> {
  let goalQuery = supabase
    .from('ads_data_goal')
    .select('goal_revenue')
    .eq('period_type', 'monthly')
    .gte('start_date', startDate)
    .lte('start_date', endDate);
  if (managerId != null) goalQuery = goalQuery.eq('manager_id', managerId) as typeof goalQuery;
  else goalQuery = goalQuery.is('manager_id', null) as typeof goalQuery;
  const { data, error } = await goalQuery.single();
  if (error && (error as { code?: string }).code !== 'PGRST116') {
    console.error('목표 조회 오류:', error);
  }
  return data ? ((data as { goal_revenue?: number }).goal_revenue ?? 0) : 0;
}

export interface WeeklyViewRow {
  week_start: string;
  week_end?: string;
  weekly_amount: number;
  client_id?: number;
}

/** ads_data_v_weekly 뷰 조회 (매니저 필터 선택) */
export async function fetchWeeklyViewRows(
  supabase: SupabaseClient,
  managerId: number | null
): Promise<WeeklyViewRow[]> {
  let query = supabase
    .from('ads_data_v_weekly')
    .select('week_start, week_end, weekly_amount, client_id')
    .order('week_start', { ascending: false })
    .limit(10000);
  if (managerId != null) query = query.eq('manager_id', managerId) as typeof query;
  const { data, error } = await query;
  if (error) {
    console.error('주간 뷰 조회 오류:', error);
    return [];
  }
  return (data ?? []) as WeeklyViewRow[];
}

/** 매니저 목록 (ads 팀, id 98/99 제외) */
export async function fetchManagersForAds(supabase: SupabaseClient): Promise<{ id: number; manager_name: string }[]> {
  const { data, error } = await supabase
    .from('shared_manager')
    .select('id, manager_name')
    .eq('manager_team', 'ads')
    .neq('id', 98)
    .neq('id', 99)
    .order('id', { ascending: true });
  if (error) {
    console.error('매니저 목록 조회 오류:', error);
    return [];
  }
  return (data ?? []) as { id: number; manager_name: string }[];
}

/** 월 내 마지막 데이터 날짜 1건 (날짜 범위 계산용) */
export async function fetchLastDateInMonth(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  managerId: number | null
): Promise<string | null> {
  let query = supabase
    .from('ads_data_daily')
    .select('date')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (managerId != null) query = query.eq('manager_id', managerId) as typeof query;
  const { data } = await query;
  return data && (data as { date?: string }).date ? (data as { date: string }).date : null;
}
