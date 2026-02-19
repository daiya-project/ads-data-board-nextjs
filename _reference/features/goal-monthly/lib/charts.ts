/**
 * Goal Monthly — 차트 섹션 (누적 매출 + 주간 매출/광고주)
 * Dashboard의 Manager Performance 차트를 공유 유틸로 재활용
 */

import { getSupabaseClientSafe } from '@shared/api';
import { formatDate } from '@shared/lib';
import {
  renderCumulativeChart,
  renderWeeklyMixedChart,
} from '@shared/lib/chart-utils';
import type { MonthlyChartData, MonthlyCumulativePoint, WeeklyChartItem } from '@shared/lib/chart-utils';
import type { SupabaseClient } from '../../../types';
import type { DailySummaryRow } from './types';
import {
  isSecondManagerTarget,
  SECOND_MANAGER_TARGET_ID,
  fetchSecondManagerClientIds,
  fetchDailyAmountByClientIds,
  fetchWeeklyAmountByClientIds,
} from '@shared/ui/common/second-manager';

const CUMULATIVE_CANVAS = 'goal-monthly-cumulative-chart';
const WEEKLY_CANVAS = 'goal-monthly-weekly-chart';

/* ---------- 진입점 ---------- */

export async function loadGoalMonthlyCharts(
  selectedMonth: string,
  managerId: number | null
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  if (typeof (window as unknown as { Chart?: unknown }).Chart === 'undefined') {
    console.error('[Goal Monthly] Chart.js 미로드');
    return;
  }

  try {
    const [monthlyData, weeklyData] = await Promise.all([
      fetchCumulativeData(supabase, selectedMonth, managerId),
      fetchWeeklyChartData(supabase, selectedMonth, managerId),
    ]);

    if (monthlyData) {
      renderCumulativeChart(CUMULATIVE_CANVAS, monthlyData);
    }
    renderWeeklyMixedChart(WEEKLY_CANVAS, weeklyData);
  } catch (err) {
    console.error('[Goal Monthly] 차트 로드 오류:', err);
  }
}

/* ---------- 누적 매출 데이터 (ads_data_v_daily_summary 활용) ---------- */

async function fetchCumulativeData(
  supabase: SupabaseClient,
  selectedMonth: string,
  managerId: number | null
): Promise<MonthlyChartData | null> {
  const [y, m] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  // 일별 매출 조회 (뷰에서 매니저별 집계 완료)
  let query = supabase
    .from('ads_data_v_daily_summary')
    .select('date, manager_id, daily_amount')
    .gte!('date', startDate)
    .lte!('date', endDate)
    .order('date', { ascending: true });

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }

  const result = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  if (result.error) {
    console.error('[Goal Monthly] 누적 차트 데이터 조회 오류:', result.error);
    return null;
  }
  const rows = result.data;

  // 날짜별 합산 (전체 선택 시 매니저별 행을 합산)
  const dailyMap = new Map<number, number>();
  for (const row of (rows as DailySummaryRow[]) ?? []) {
    const dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : String(row.date);
    const parts = dateStr.split('-');
    const day = parseInt(parts[2], 10);
    if (isNaN(day)) continue;
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + (parseFloat(String(row.daily_amount)) || 0));
  }

  // ── 보조 담당자(second_manager_id) 매출 합산 ──
  if (isSecondManagerTarget(managerId)) {
    const secondClientIds = await fetchSecondManagerClientIds(supabase, SECOND_MANAGER_TARGET_ID);
    if (secondClientIds.length > 0) {
      const secondDailyMap = await fetchDailyAmountByClientIds(
        supabase, secondClientIds, startDate, endDate
      );
      for (const [dateStr, amt] of secondDailyMap) {
        const parts = dateStr.split('-');
        const day = parseInt(parts[2], 10);
        if (!isNaN(day)) {
          dailyMap.set(day, (dailyMap.get(day) ?? 0) + amt);
        }
      }
    }
  }

  // 누적 계산
  let lastDataDay = 0;
  let cumulative = 0;
  const cumulativeData: MonthlyCumulativePoint[] = [];

  if (dailyMap.size > 0) {
    lastDataDay = Math.max(...dailyMap.keys());
  }

  for (let day = 1; day <= lastDataDay; day++) {
    const amt = dailyMap.get(day) ?? 0;
    cumulative += amt;
    cumulativeData.push({ day, cumulative });
  }

  // 예측
  const avgDaily = lastDataDay > 0 ? cumulative / lastDataDay : 0;
  const projectedData: MonthlyCumulativePoint[] = [];
  let projCum = cumulative;
  for (let day = lastDataDay + 1; day <= daysInMonth; day++) {
    projCum += avgDaily;
    projectedData.push({ day, cumulative: projCum });
  }

  // 월 목표
  let goalQuery = supabase
    .from('ads_data_goal')
    .select('goal_revenue')
    .eq('period_type', 'monthly')
    .gte!('start_date', startDate)
    .lte!('start_date', endDate);

  if (managerId) {
    goalQuery = goalQuery.eq('manager_id', managerId);
  } else {
    goalQuery = goalQuery.is('manager_id', null);
  }

  const goalResult = await (goalQuery as unknown as Promise<{ data: unknown; error: unknown }>);
  let monthlyGoal = 0;
  const goalRows = goalResult.data;
  if (goalRows && Array.isArray(goalRows)) {
    for (const g of goalRows as { goal_revenue?: number }[]) {
      monthlyGoal += g.goal_revenue ?? 0;
    }
  }

  return {
    data: cumulativeData,
    projectedData,
    goal: monthlyGoal,
    daysInMonth,
    lastDataDay,
    averageDailyRevenue: avgDaily,
  };
}

/* ---------- 주간 차트 데이터 (ads_data_v_weekly 활용) ---------- */

async function fetchWeeklyChartData(
  supabase: SupabaseClient,
  selectedMonth: string,
  managerId: number | null
): Promise<WeeklyChartItem[]> {
  let query = supabase
    .from('ads_data_v_weekly')
    .select('week_start, week_end, weekly_amount, client_id')
    .order('week_start', { ascending: false })
    .limit(10000);

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }

  const weekResult = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  if (weekResult.error) {
    console.error('[Goal Monthly] 주간 차트 데이터 조회 오류:', weekResult.error);
    return [];
  }

  const rows = weekResult.data as { week_start: string; weekly_amount: number; client_id?: number }[] | null;
  if (!rows?.length) return [];

  const allWeeks = [...new Set(rows.map((r) => r.week_start))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const weekDataMap = new Map<string, typeof rows>();
  for (const item of rows) {
    if (!weekDataMap.has(item.week_start)) weekDataMap.set(item.week_start, []);
    weekDataMap.get(item.week_start)!.push(item);
  }

  // 해당 월의 마지막 주를 기준으로 4주
  const rowsInMonth = rows.filter((r) => {
    const ws = typeof r.week_start === 'string' ? r.week_start.slice(0, 7) : '';
    return ws === selectedMonth;
  });
  const uniqueInMonth = [...new Set(rowsInMonth.map((r) => r.week_start))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  let targetWeeks: string[];
  if (uniqueInMonth.length > 0) {
    const lastWeek = uniqueInMonth[0];
    const idx = allWeeks.indexOf(lastWeek);
    targetWeeks = idx >= 0 ? allWeeks.slice(idx, idx + 4) : allWeeks.slice(0, 4);
  } else {
    targetWeeks = allWeeks.slice(0, 4);
  }

  if (!targetWeeks.length) return [];

  // ── 보조 담당자(second_manager_id) 주간 데이터 조회 ──
  let secondWeeklyRows: { week_start: string; weekly_amount: number; client_id: number }[] = [];
  if (isSecondManagerTarget(managerId)) {
    const secondClientIds = await fetchSecondManagerClientIds(supabase, SECOND_MANAGER_TARGET_ID);
    if (secondClientIds.length > 0) {
      secondWeeklyRows = await fetchWeeklyAmountByClientIds(supabase, secondClientIds, targetWeeks);
    }
  }

  const weeklyData: WeeklyChartItem[] = [];
  for (const weekStart of targetWeeks) {
    const weekData = weekDataMap.get(weekStart) ?? [];

    // 기존 매출 + 보조 담당자 매출
    let totalRevenue = weekData.reduce((s, r) => s + (parseFloat(String(r.weekly_amount)) || 0), 0);
    const clientIdSet = new Set(
      weekData.filter((r) => (parseFloat(String(r.weekly_amount)) || 0) > 0 && r.client_id).map((r) => r.client_id)
    );

    // 보조 담당자 데이터 합산
    const secondRows = secondWeeklyRows.filter((r) => r.week_start === weekStart);
    for (const sr of secondRows) {
      totalRevenue += sr.weekly_amount;
      if (sr.weekly_amount > 0 && sr.client_id) {
        clientIdSet.add(sr.client_id);
      }
    }

    weeklyData.push({
      weekLabel: weekStart,
      revenue: totalRevenue,
      clientCount: clientIdSet.size,
      weekStart,
    });
  }

  return weeklyData;
}
