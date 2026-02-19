/**
 * Dashboard 데이터 레이어 — API 호출 + 비즈니스 로직
 * shared/api/dashboard-api는 Supabase 쿼리만, 여기서는 조회 오케스트레이션·계산.
 */

import type { SupabaseClient } from '@shared/types';
import { formatDate } from '@shared/lib/utils/date';
import { getLatestMonthFromDb } from '@shared/lib/getLatestMonthFromDb';
import {
  getDefaultSelectedMonth,
  fetchDailyInMonthRange,
  fetchTeamGoalForMonth,
  fetchWeeklyViewRows,
  fetchLastDateInMonth,
  fetchManagersForAds,
  type DailyAmountRow as ApiDailyAmountRow,
  type WeeklyViewRow,
} from '@shared/api/dashboard-api';
import {
  isSecondManagerTarget,
  SECOND_MANAGER_TARGET_ID,
  fetchSecondManagerClientIds,
  fetchDailyAmountByClientIds,
  fetchWeeklyAmountByClientIds,
} from '@shared/ui/common/second-manager';
import type {
  MonthlyChartData,
  WeeklyChartItem,
  MonthlyCumulativePoint,
} from './types';

export { getDefaultSelectedMonth, fetchManagersForAds };
export type { MonthlyChartData, WeeklyChartItem };

/** API에서 오는 일별 행 (date는 string) */
type DailyAmountRow = ApiDailyAmountRow & { date?: string | Date };

/**
 * 월별 누적·예상 데이터 계산 (순수 함수)
 */
export function calculateMonthlyCumulative(
  dailyData: DailyAmountRow[],
  firstDay: Date,
  lastDay: Date,
  monthlyGoal: number
): MonthlyChartData {
  const daysInMonth = lastDay.getDate();
  const cumulativeData: MonthlyCumulativePoint[] = [];
  const projectedData: MonthlyCumulativePoint[] = [];
  let cumulativeAmount = 0;
  const dailyAmountMap = new Map<number, number>();
  const dataDaysSet = new Set<number>();
  const currentYear = firstDay.getFullYear();
  const currentMonth = firstDay.getMonth() + 1;

  for (const item of dailyData) {
    if (!item.date) continue;
    let year: number | undefined;
    let month: number | undefined;
    let day: number | undefined;

    if (typeof item.date === 'string') {
      const datePart = item.date.split(/[T\s]/)[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    } else if (item.date instanceof Date) {
      year = item.date.getFullYear();
      month = item.date.getMonth() + 1;
      day = item.date.getDate();
    }

    if (year === currentYear && month === currentMonth && day && day >= 1 && day <= 31) {
      const amount = parseFloat(String(item.amount)) || 0;
      dailyAmountMap.set(day, (dailyAmountMap.get(day) || 0) + amount);
      dataDaysSet.add(day);
    }
  }

  let lastDataDay = 0;
  if (dataDaysSet.size > 0) {
    lastDataDay = Math.max(...Array.from(dataDaysSet));
  }

  for (let day = 1; day <= lastDataDay; day++) {
    const dayAmount = dailyAmountMap.get(day) || 0;
    cumulativeAmount += dayAmount;
    cumulativeData.push({ day, cumulative: cumulativeAmount });
  }

  const averageDailyRevenue = lastDataDay > 0 ? cumulativeAmount / lastDataDay : 0;
  let projectedCumulative = cumulativeAmount;
  for (let day = lastDataDay + 1; day <= daysInMonth; day++) {
    projectedCumulative += averageDailyRevenue;
    projectedData.push({ day, cumulative: projectedCumulative });
  }

  return {
    data: cumulativeData,
    projectedData,
    goal: monthlyGoal,
    daysInMonth,
    lastDataDay,
    averageDailyRevenue,
  };
}

/**
 * 대시보드 월간 차트용 데이터 조회 (팀 전체)
 */
export async function getDashboardMonthlyChartData(
  supabase: SupabaseClient,
  selectedMonth: string
): Promise<MonthlyChartData> {
  const [y, m] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  const lastDateStr = await fetchLastDateInMonth(supabase, startDate, endDate, null);
  let actualLastDay = lastDay;
  if (lastDateStr) {
    const dbLast = new Date(lastDateStr);
    if (dbLast.getFullYear() === y && dbLast.getMonth() + 1 === m) actualLastDay = dbLast;
  }
  const dateRange: string[] = [];
  const actualLastDayNum = actualLastDay.getDate();
  for (let day = 1; day <= actualLastDayNum; day++) {
    dateRange.push(formatDate(new Date(y, m - 1, day)));
  }

  const dailyData = await fetchDailyInMonthRange(supabase, dateRange, null);
  const monthlyGoal = await fetchTeamGoalForMonth(supabase, startDate, endDate, null);
  return calculateMonthlyCumulative(dailyData || [], firstDay, lastDay, monthlyGoal);
}

/**
 * 대시보드 주간 차트용 데이터 조회 (팀 전체)
 */
export async function getDashboardWeeklyChartData(
  supabase: SupabaseClient,
  selectedMonth: string,
  getLatestMonth: () => Promise<string>
): Promise<WeeklyChartItem[]> {
  const latestMonth = await getLatestMonth();
  const rows = await fetchWeeklyViewRows(supabase, null);
  return buildWeeklyChartItems(rows, selectedMonth, latestMonth);
}

/**
 * 매니저별 월간 차트 데이터 (보조 담당자 로직 포함)
 */
export async function getManagerMonthlyChartData(
  supabase: SupabaseClient,
  managerId: number | null,
  selectedMonth: string
): Promise<MonthlyChartData | null> {
  try {
    const [y, m] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startDate = formatDate(firstDay);
    const endDate = formatDate(lastDay);

    const lastDateStr = await fetchLastDateInMonth(supabase, startDate, endDate, managerId);
    let actualLastDay = lastDay;
    if (lastDateStr) {
      const dbLast = new Date(lastDateStr);
      if (dbLast.getFullYear() === y && dbLast.getMonth() + 1 === m) actualLastDay = dbLast;
    }
    const dateRange: string[] = [];
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dateRange.push(formatDate(new Date(y, m - 1, day)));
    }

    let dailyData = await fetchDailyInMonthRange(supabase, dateRange, managerId) as DailyAmountRow[];

    if (isSecondManagerTarget(managerId)) {
      const secondClientIds = await fetchSecondManagerClientIds(supabase, SECOND_MANAGER_TARGET_ID);
      if (secondClientIds.length > 0) {
        const secondDailyMap = await fetchDailyAmountByClientIds(
          supabase,
          secondClientIds,
          startDate,
          endDate
        );
        for (const [dateStr, amt] of secondDailyMap) {
          dailyData.push({ date: dateStr, amount: amt });
        }
      }
    }

    const monthlyGoal = await fetchTeamGoalForMonth(supabase, startDate, endDate, managerId);
    return calculateMonthlyCumulative(dailyData || [], firstDay, lastDay, monthlyGoal);
  } catch (error) {
    console.error('매니저별 월간 데이터 계산 오류:', error);
    return null;
  }
}

/**
 * 매니저별 주간 차트 데이터 (보조 담당자 로직 포함)
 */
export async function getManagerWeeklyChartData(
  supabase: SupabaseClient,
  managerId: number | null,
  selectedMonth: string,
  getLatestMonth: () => Promise<string>
): Promise<WeeklyChartItem[]> {
  const latestMonth = await getLatestMonth();
  const rows = await fetchWeeklyViewRows(supabase, managerId);
  const { targetWeeks, weekLabels } = resolveTargetWeeks(rows, selectedMonth, latestMonth);
  if (targetWeeks.length === 0) return [];

  let secondWeeklyRows: { week_start: string; weekly_amount: number; client_id: number }[] = [];
  if (isSecondManagerTarget(managerId)) {
    const secondClientIds = await fetchSecondManagerClientIds(supabase, SECOND_MANAGER_TARGET_ID);
    if (secondClientIds.length > 0) {
      secondWeeklyRows = await fetchWeeklyAmountByClientIds(supabase, secondClientIds, targetWeeks);
    }
  }

  const weekDataMap = new Map<string, WeeklyViewRow[]>();
  for (const item of rows) {
    const weekStart = item.week_start;
    if (!weekDataMap.has(weekStart)) weekDataMap.set(weekStart, []);
    weekDataMap.get(weekStart)!.push(item);
  }

  const weeklyData: WeeklyChartItem[] = [];
  for (let i = 0; i < targetWeeks.length; i++) {
    const weekStart = targetWeeks[i];
    const weekData = weekDataMap.get(weekStart) || [];
    let totalRevenue = weekData.reduce(
      (sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0),
      0
    );
    const clientIdSet = new Set(
      weekData
        .filter(
          (item) =>
            (parseFloat(String(item.weekly_amount)) || 0) > 0 && item.client_id != null
        )
        .map((item) => item.client_id!)
    );
    for (const sr of secondWeeklyRows.filter((r) => r.week_start === weekStart)) {
      totalRevenue += sr.weekly_amount;
      if (sr.weekly_amount > 0 && sr.client_id) clientIdSet.add(sr.client_id);
    }
    weeklyData.push({
      weekLabel: weekLabels[i],
      revenue: totalRevenue,
      clientCount: clientIdSet.size,
      weekStart,
    });
  }
  return weeklyData;
}

function buildWeeklyChartItems(
  rows: WeeklyViewRow[],
  selectedMonth: string,
  latestMonth: string
): WeeklyChartItem[] {
  if (!rows || rows.length === 0) return [];

  const allWeeks = [...new Set(rows.map((item) => item.week_start))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const weekDataMap = new Map<string, WeeklyViewRow[]>();
  for (const item of rows) {
    const weekStart = item.week_start;
    if (!weekDataMap.has(weekStart)) weekDataMap.set(weekStart, []);
    weekDataMap.get(weekStart)!.push(item);
  }

  const isCurrentMonth = selectedMonth === latestMonth;
  let targetWeeks: string[];
  let weekLabels: string[];

  if (isCurrentMonth) {
    targetWeeks = allWeeks.slice(0, 4);
    weekLabels = ['4주 전', '3주 전', '2주 전', '전 주'];
  } else {
    const rowsInMonth = rows.filter((item) => {
      const ws = item.week_start;
      const part = typeof ws === 'string' ? ws.slice(0, 7) : '';
      return part === selectedMonth;
    });
    const uniqueInMonth = [...new Set(rowsInMonth.map((r) => r.week_start))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const lastWeekOfMonth = uniqueInMonth[0];
    if (!lastWeekOfMonth) return [];
    const idx = allWeeks.indexOf(lastWeekOfMonth);
    if (idx < 0) return [];
    targetWeeks = allWeeks.slice(idx, idx + 4);
    weekLabels = ['3주 전', '2주 전', '1주 전', '해당 주'];
  }

  if (targetWeeks.length === 0) return [];

  const weeklyData: WeeklyChartItem[] = [];
  for (let i = 0; i < targetWeeks.length; i++) {
    const weekStart = targetWeeks[i];
    const weekData = weekDataMap.get(weekStart) || [];
    const totalRevenue = weekData.reduce(
      (sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0),
      0
    );
    const uniqueClients = new Set(
      weekData
        .filter(
          (item) =>
            (parseFloat(String(item.weekly_amount)) || 0) > 0 && item.client_id != null
        )
        .map((item) => item.client_id!)
    );
    weeklyData.push({
      weekLabel: weekLabels[i],
      revenue: totalRevenue,
      clientCount: uniqueClients.size,
      weekStart,
    });
  }
  return weeklyData;
}

function resolveTargetWeeks(
  rows: WeeklyViewRow[],
  selectedMonth: string,
  latestMonth: string
): { targetWeeks: string[]; weekLabels: string[] } {
  const allWeeks = [...new Set(rows.map((item) => item.week_start))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const isCurrentMonth = selectedMonth === latestMonth;
  if (isCurrentMonth) {
    return {
      targetWeeks: allWeeks.slice(0, 4),
      weekLabels: ['4주 전', '3주 전', '2주 전', '전 주'],
    };
  }
  const rowsInMonth = rows.filter((item) => {
    const ws = item.week_start;
    const part = typeof ws === 'string' ? ws.slice(0, 7) : '';
    return part === selectedMonth;
  });
  const uniqueInMonth = [...new Set(rowsInMonth.map((r) => r.week_start))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const lastWeekOfMonth = uniqueInMonth[0];
  if (!lastWeekOfMonth) return { targetWeeks: [], weekLabels: [] };
  const idx = allWeeks.indexOf(lastWeekOfMonth);
  if (idx < 0) return { targetWeeks: [], weekLabels: [] };
  return {
    targetWeeks: allWeeks.slice(idx, idx + 4),
    weekLabels: ['3주 전', '2주 전', '1주 전', '해당 주'],
  };
}

/** 라우터/컴포넌트에서 "최신 월"을 주입할 때 사용. 기본은 getLatestMonthFromDb */
export async function getLatestMonthForDashboard(): Promise<string> {
  return getLatestMonthFromDb();
}
