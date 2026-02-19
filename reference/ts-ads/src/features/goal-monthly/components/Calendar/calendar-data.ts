/**
 * Goal Monthly — 캘린더 데이터 로딩
 * shared_week + ads_data_v_daily_summary + ads_data_v_weekly_progress + ads_data_goal 활용
 */

import { getSupabaseClientSafe } from '@shared/api';
import type { SupabaseClient } from '@shared/types';
import type {
  DailySummaryRow,
  DayCell,
  WeekGoalSummary,
  CalendarWeekRow,
  CalendarData,
} from '../../lib/types';
import {
  isSecondManagerTarget,
  SECOND_MANAGER_TARGET_ID,
  fetchSecondManagerClientIds,
  fetchDailyAmountByClientIds,
} from '@shared/ui/common/second-manager';

/* ================================================================
   진입점
   ================================================================ */

export async function fetchCalendarData(
  selectedMonth: string,
  managerId: number | null
): Promise<CalendarData | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  const [y, m] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

  try {
    // 1. shared_week에서 해당 월에 걸치는 주차 조회
    const weeks = await fetchWeeksForMonth(supabase, monthStart, monthEnd);
    if (!weeks.length) return null;

    const firstWeekStart = weeks[0].start_date;
    const lastWeekEnd = weeks[weeks.length - 1].end_date;

    // 2~4 를 병렬 조회
    const [dailySummary, monthlyGoalTotal, holidayDates] = await Promise.all([
      fetchDailySummary(supabase, firstWeekStart, lastWeekEnd, managerId),
      fetchMonthlyGoal(supabase, monthStart, monthEnd, managerId),
      fetchHolidayDates(supabase, firstWeekStart, lastWeekEnd),
    ]);

    // 날짜별 매출 맵 (date → amount)
    const dailyMap = buildDailyMap(dailySummary, managerId);

    // ── 보조 담당자(second_manager_id) 매출 합산 ──
    if (isSecondManagerTarget(managerId)) {
      const secondClientIds = await fetchSecondManagerClientIds(supabase, SECOND_MANAGER_TARGET_ID);
      if (secondClientIds.length > 0) {
        const secondDailyMap = await fetchDailyAmountByClientIds(
          supabase, secondClientIds, firstWeekStart, lastWeekEnd
        );
        for (const [date, amt] of secondDailyMap) {
          dailyMap.set(date, (dailyMap.get(date) ?? 0) + amt);
        }
      }
    }

    // 공휴일/주말 맵 (date → { isHoliday, isWeekend })
    const flagsMap = buildFlagsMap(dailySummary);

    // 최신 데이터 날짜
    const latestDate = findLatestDate(dailySummary);

    // 일별 목표 (월 목표 / 총 일수)
    const dailyGoal = daysInMonth > 0 ? monthlyGoalTotal / daysInMonth : 0;

    // CalendarWeekRow[] 조합
    const calendarWeeks: CalendarWeekRow[] = [];

    for (let i = 0; i < weeks.length; i++) {
      const wk = weeks[i];
      const days = buildDayCells(wk.start_date, wk.end_date, y, m, dailyMap, flagsMap, holidayDates, latestDate);

      // 주차 범위 포맷
      const ws = wk.start_date.slice(5).replace('-', '/');
      const we = wk.end_date.slice(5).replace('-', '/');

      // 프로그래스 바 목표: dailyGoal × 해당 주에서 해당 월에 속하는 일수
      const daysInCurrentMonth = days.filter((d) => d.isCurrentMonth).length;
      const weekGoal = dailyGoal * daysInCurrentMonth;

      // 달성 매출: 당월에 해당하는 일자의 매출만 합산
      let weekAchieved = 0;
      for (const day of days) {
        if (day.isCurrentMonth && day.hasData) {
          weekAchieved += day.amount;
        }
      }

      // 전주 달성: 전주의 당월 일자 매출 합산
      let prevWeekAchieved: number | null = null;
      if (i > 0) {
        const prevDays = calendarWeeks[i - 1].days;
        let prevSum = 0;
        for (const day of prevDays) {
          if (day.isCurrentMonth && day.hasData) {
            prevSum += day.amount;
          }
        }
        prevWeekAchieved = prevSum;
      }

      const goalSummary: WeekGoalSummary | null =
        monthlyGoalTotal > 0
          ? {
              weekGoal,
              weekAchieved,
              rate: weekGoal > 0 ? (weekAchieved / weekGoal) * 100 : 0,
              prevWeekAchieved,
            }
          : null;

      calendarWeeks.push({
        weekId: wk.week_id,
        weekLabel: wk.week_label,
        weekRange: `${ws} ~ ${we}`,
        weekStart: wk.start_date,
        weekEnd: wk.end_date,
        days,
        goalSummary,
      });
    }

    // 평일 평균 매출 (텍스트 색상 기준)
    const weekdayAvg = calcWeekdayAvg(calendarWeeks);

    return { weeks: calendarWeeks, weekdayAvg, latestDate };
  } catch (err) {
    console.error('[Goal Monthly] 캘린더 데이터 로드 오류:', err);
    return null;
  }
}

/* ================================================================
   개별 데이터 조회
   ================================================================ */

interface WeekMasterRow {
  week_id: string;
  start_date: string;
  end_date: string;
  week_label: string;
}

async function fetchWeeksForMonth(
  supabase: SupabaseClient,
  monthStart: string,
  monthEnd: string
): Promise<WeekMasterRow[]> {
  const result = await (supabase
    .from('shared_week')
    .select('week_id, start_date, end_date, week_label')
    .lte!('start_date', monthEnd)
    .gte!('end_date', monthStart)
    .order('start_date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (result.error) {
    console.error('[Goal Monthly] shared_week 조회 오류:', result.error);
    return [];
  }
  return (result.data as WeekMasterRow[]) ?? [];
}

async function fetchDailySummary(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  managerId: number | null
): Promise<DailySummaryRow[]> {
  let query = supabase
    .from('ads_data_v_daily_summary')
    .select('date, manager_id, daily_amount, client_count, is_holiday, is_weekend')
    .gte!('date', startDate)
    .lte!('date', endDate)
    .order('date', { ascending: true });

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }

  const result = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  if (result.error) {
    console.error('[Goal Monthly] daily_summary 조회 오류:', result.error);
    return [];
  }
  return (result.data as DailySummaryRow[]) ?? [];
}

async function fetchMonthlyGoal(
  supabase: SupabaseClient,
  monthStart: string,
  monthEnd: string,
  managerId: number | null
): Promise<number> {
  let query = supabase
    .from('ads_data_goal')
    .select('goal_revenue')
    .eq('period_type', 'monthly')
    .gte!('start_date', monthStart)
    .lte!('start_date', monthEnd);

  if (managerId) {
    query = query.eq('manager_id', managerId);
  } else {
    query = query.is('manager_id', null);
  }

  const result = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  if (result.error) {
    console.error('[Goal Monthly] 월 목표 조회 오류:', result.error);
    return 0;
  }

  let total = 0;
  const rows = result.data;
  if (rows && Array.isArray(rows)) {
    for (const row of rows as { goal_revenue?: number }[]) {
      total += row.goal_revenue ?? 0;
    }
  }
  return total;
}

/** ads_data_daily 테이블에서 공휴일 날짜 목록 조회 */
async function fetchHolidayDates(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<Set<string>> {
  const result = await (supabase
    .from('ads_data_daily')
    .select('date')
    .eq('is_holiday', true)
    .gte!('date', startDate)
    .lte!('date', endDate) as unknown as Promise<{ data: unknown; error: unknown }>);

  const dates = new Set<string>();
  if (result.data && Array.isArray(result.data)) {
    for (const row of result.data as { date: string }[]) {
      dates.add(toDateStr(row.date));
    }
  }
  return dates;
}

/* ================================================================
   데이터 가공
   ================================================================ */

function toDateStr(d: string | Date): string {
  return typeof d === 'string' ? d.split('T')[0] : String(d);
}

/** 날짜별 매출 합산 맵 */
function buildDailyMap(
  rows: DailySummaryRow[],
  _managerId: number | null
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const date = toDateStr(row.date);
    const amt = parseFloat(String(row.daily_amount)) || 0;
    map.set(date, (map.get(date) ?? 0) + amt);
  }
  return map;
}

/** 공휴일/주말 플래그 맵 */
function buildFlagsMap(rows: DailySummaryRow[]): Map<string, { isHoliday: boolean; isWeekend: boolean }> {
  const map = new Map<string, { isHoliday: boolean; isWeekend: boolean }>();
  for (const row of rows) {
    const date = toDateStr(row.date);
    if (!map.has(date)) {
      map.set(date, { isHoliday: !!row.is_holiday, isWeekend: !!row.is_weekend });
    }
  }
  return map;
}

/** 최신 데이터 날짜 */
function findLatestDate(rows: DailySummaryRow[]): string {
  let latest = '';
  for (const row of rows) {
    const date = toDateStr(row.date);
    if (date > latest) latest = date;
  }
  return latest;
}

/* ================================================================
   DayCell 빌드
   ================================================================ */

function buildDayCells(
  weekStart: string,
  weekEnd: string,
  year: number,
  month: number,
  dailyMap: Map<string, number>,
  flagsMap: Map<string, { isHoliday: boolean; isWeekend: boolean }>,
  holidayDates: Set<string>,
  latestDate: string
): DayCell[] {
  const days: DayCell[] = [];
  const start = new Date(weekStart + 'T00:00:00');

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const jsDay = d.getDay(); // 0=일, 1=월, ..., 6=토
    const isCurrentMonth = d.getFullYear() === year && d.getMonth() + 1 === month;

    const flags = flagsMap.get(dateStr);
    const isWeekend = flags?.isWeekend ?? (jsDay === 0 || jsDay === 6);
    const isHoliday = flags?.isHoliday ?? holidayDates.has(dateStr);

    const amount = dailyMap.get(dateStr) ?? 0;
    const hasData = dailyMap.has(dateStr) && amount > 0;

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    days.push({
      date: dateStr,
      dayOfWeek: jsDay === 0 ? 6 : jsDay - 1,
      dayLabel: `${mm}. ${dd}.`,
      amount,
      isCurrentMonth,
      isWeekend,
      isHoliday,
      isLatestData: dateStr === latestDate,
      isFuture: latestDate ? dateStr > latestDate : false,
      hasData,
    });
  }
  return days;
}

function calcWeekdayAvg(weeks: CalendarWeekRow[]): number {
  let sum = 0;
  let count = 0;
  for (const week of weeks) {
    for (const day of week.days) {
      if (!day.isCurrentMonth) continue;
      if (!day.hasData) continue;
      if (day.isWeekend || day.isHoliday) continue;
      sum += day.amount;
      count++;
    }
  }
  return count > 0 ? sum / count : 1;
}
