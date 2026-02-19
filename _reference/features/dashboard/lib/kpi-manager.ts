/**
 * 매니저별 KPI 카드 (일/주/월/예상) 로드
 */

import { formatDate } from '@shared/lib/utils/date';
import { formatNumberWithCommas } from '@shared/lib/utils/format';
import { getManagerMonthlyChartData } from './dashboard-data';
import { getLatestMonthFromDb } from './dashboard-state';
import type { MonthlyChartData } from './dashboard-data';
import type { SupabaseClient } from '@shared/types';

const DASH_STR = '–';

function setPlaceholder(...ids: string[]): void {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = DASH_STR;
  });
}

async function loadManagerDailyKPICard(supabase: SupabaseClient, managerId: number | null): Promise<void> {
  try {
    let query: ReturnType<SupabaseClient['from']> = supabase
      .from('ads_data_daily')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (managerId) query = query.eq('manager_id', managerId);

    const { data: lastDateData, error: lastDateError } = await query;

    if (lastDateError || !lastDateData) {
      const el = (id: string) => document.getElementById(id);
      if (el('manager-daily-current')) el('manager-daily-current')!.textContent = '0';
      if (el('manager-daily-previous')) el('manager-daily-previous')!.textContent = '0';
      if (el('manager-daily-change-amount')) el('manager-daily-change-amount')!.textContent = '0';
      if (el('manager-daily-change-rate')) el('manager-daily-change-rate')!.textContent = '0%';
      return;
    }

    const lastDate = (lastDateData as { date: string }).date;
    const lastDateObj = new Date(lastDate);
    const previousDateObj = new Date(lastDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = formatDate(previousDateObj);
    const lastDateStr = formatDate(lastDateObj);

    let dailyQuery: ReturnType<SupabaseClient['from']> = supabase
      .from('ads_data_daily')
      .select('date, amount')
      .in('date', [lastDateStr, previousDate])
      .order('date', { ascending: false });
    if (managerId) dailyQuery = dailyQuery.eq('manager_id', managerId);

    const { data: dailyData, error: dailyError } = await dailyQuery;
    if (dailyError) {
      console.error('일별 매출 데이터 조회 오류:', dailyError);
      return;
    }

    const dailyMap = new Map<string, number>();
    (dailyData as { date: string | Date; amount: number }[] || []).forEach((item) => {
      const date =
        item.date instanceof Date
          ? formatDate(item.date)
          : typeof item.date === 'string'
            ? item.date.split('T')[0]
            : String(item.date);
      const amount = parseFloat(String(item.amount)) || 0;
      dailyMap.set(date, (dailyMap.get(date) || 0) + amount);
    });

    const currentAmount = dailyMap.get(lastDateStr) || 0;
    const previousAmount = dailyMap.get(previousDate) || 0;
    const changeAmount = currentAmount - previousAmount;
    const changeRate =
      previousAmount > 0
        ? ((currentAmount / previousAmount) * 100 - 100).toFixed(1)
        : currentAmount > 0
          ? '∞'
          : '0.0';

    const cur = document.getElementById('manager-daily-current');
    const prev = document.getElementById('manager-daily-previous');
    const changeAmt = document.getElementById('manager-daily-change-amount');
    const changeRt = document.getElementById('manager-daily-change-rate');
    if (cur) cur.textContent = formatNumberWithCommas(currentAmount);
    if (prev) prev.textContent = formatNumberWithCommas(previousAmount);
    if (changeAmt) {
      changeAmt.textContent = (changeAmount >= 0 ? '+' : '') + formatNumberWithCommas(changeAmount);
      changeAmt.className = 'KpiCard__changeAmount ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
    if (changeRt) {
      changeRt.textContent = (changeAmount >= 0 ? '+' : '') + changeRate + '%';
      changeRt.className = 'KpiCard__change ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
  } catch (error) {
    console.error('매니저별 Daily KPI 카드 로드 오류:', error);
  }
}

async function loadManagerWeeklyKPICard(supabase: SupabaseClient, managerId: number | null): Promise<void> {
  try {
    let query: ReturnType<SupabaseClient['from']> = supabase
      .from('ads_data_v_weekly')
      .select('week_start, week_end, weekly_amount')
      .order('week_start', { ascending: false })
      .limit(10000);
    if (managerId) query = query.eq('manager_id', managerId);

    const { data: weeklyViewData, error: viewError } = await query;
    if (viewError) {
      console.error('주간 뷰 데이터 조회 오류:', viewError);
      return;
    }

    const rows = weeklyViewData as { week_start: string; weekly_amount: number }[] | null;
    if (!rows || rows.length === 0) {
      ['manager-weekly-current', 'manager-weekly-previous', 'manager-weekly-change-amount', 'manager-weekly-change-rate'].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = id.includes('rate') ? '0%' : '0';
        }
      );
      return;
    }

    const uniqueWeeks = [...new Set(rows.map((item) => item.week_start))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    if (uniqueWeeks.length < 2) {
      const currentWeek = uniqueWeeks[0];
      const currentWeekData = rows.filter((item) => item.week_start === currentWeek);
      const currentAmount = currentWeekData.reduce((sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0), 0);
      const cur = document.getElementById('manager-weekly-current');
      if (cur) cur.textContent = formatNumberWithCommas(currentAmount);
      const prev = document.getElementById('manager-weekly-previous');
      if (prev) prev.textContent = '0';
      const changeAmt = document.getElementById('manager-weekly-change-amount');
      if (changeAmt) changeAmt.textContent = '0';
      const changeRt = document.getElementById('manager-weekly-change-rate');
      if (changeRt) changeRt.textContent = '0%';
      return;
    }

    const currentWeek = uniqueWeeks[0];
    const previousWeek = uniqueWeeks[1];
    const currentWeekData = rows.filter((item) => item.week_start === currentWeek);
    const previousWeekData = rows.filter((item) => item.week_start === previousWeek);
    const currentAmount = currentWeekData.reduce((sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0), 0);
    const previousAmount = previousWeekData.reduce((sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0), 0);
    const changeAmount = currentAmount - previousAmount;
    const changeRate =
      previousAmount > 0
        ? ((currentAmount / previousAmount) * 100 - 100).toFixed(1)
        : currentAmount > 0
          ? '∞'
          : '0.0';

    const cur = document.getElementById('manager-weekly-current');
    const prev = document.getElementById('manager-weekly-previous');
    const changeAmt = document.getElementById('manager-weekly-change-amount');
    const changeRt = document.getElementById('manager-weekly-change-rate');
    if (cur) cur.textContent = formatNumberWithCommas(currentAmount);
    if (prev) prev.textContent = formatNumberWithCommas(previousAmount);
    if (changeAmt) {
      changeAmt.textContent = (changeAmount >= 0 ? '+' : '') + formatNumberWithCommas(changeAmount);
      changeAmt.className = 'KpiCard__changeAmount ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
    if (changeRt) {
      changeRt.textContent = (changeAmount >= 0 ? '+' : '') + changeRate + '%';
      changeRt.className = 'KpiCard__change ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
  } catch (error) {
    console.error('매니저별 Weekly KPI 카드 로드 오류:', error);
  }
}

function loadManagerMonthlyKPICard(monthlyData: MonthlyChartData): void {
  try {
    const cumulativeRevenue =
      monthlyData.data.length > 0 ? monthlyData.data[monthlyData.data.length - 1].cumulative : 0;
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = monthlyData.daysInMonth || 30;
    const monthProgress = (currentDay / daysInMonth) * 100;
    const monthlyGoal = monthlyData.goal || 0;
    const achievementRate = monthlyGoal > 0 ? (cumulativeRevenue / monthlyGoal) * 100 : 0;

    const cumulativeEl = document.getElementById('manager-monthly-cumulative');
    const progressEl = document.getElementById('manager-monthly-progress');
    const achievementEl = document.getElementById('manager-monthly-achievement');
    if (cumulativeEl) cumulativeEl.textContent = formatNumberWithCommas(cumulativeRevenue);
    if (progressEl) progressEl.textContent = monthProgress.toFixed(1) + '%';
    if (achievementEl) achievementEl.textContent = achievementRate.toFixed(1) + '%';
  } catch (error) {
    console.error('매니저별 Monthly KPI 카드 로드 오류:', error);
  }
}

function loadManagerExpectedMonthlyKPICard(monthlyData: MonthlyChartData): void {
  try {
    const monthlyGoal = monthlyData.goal || 0;
    const daysInMonth = monthlyData.daysInMonth || 30;
    const currentDay = new Date().getDate();
    const lastDataDay = monthlyData.lastDataDay || currentDay;
    const actualCumulative =
      monthlyData.data.length > 0 ? monthlyData.data[monthlyData.data.length - 1].cumulative : 0;
    const averageDailyRevenue = lastDataDay > 0 ? actualCumulative / lastDataDay : 0;
    const remainingDays = daysInMonth - lastDataDay;
    const expectedMonthlyRevenue = actualCumulative + averageDailyRevenue * remainingDays;
    const expectedAchievementRate = monthlyGoal > 0 ? (expectedMonthlyRevenue / monthlyGoal) * 100 : 0;

    const expectedEl = document.getElementById('manager-expected-revenue');
    const goalEl = document.getElementById('manager-expected-goal');
    const achievementEl = document.getElementById('manager-expected-achievement');
    if (expectedEl) expectedEl.textContent = formatNumberWithCommas(Math.round(expectedMonthlyRevenue));
    if (goalEl) goalEl.textContent = formatNumberWithCommas(monthlyGoal);
    if (achievementEl) achievementEl.textContent = expectedAchievementRate.toFixed(1) + '%';
  } catch (error) {
    console.error('매니저별 Expected Monthly KPI 카드 로드 오류:', error);
  }
}

export async function loadManagerKPICards(
  supabase: SupabaseClient,
  managerId: number | null,
  selectedMonth: string
): Promise<void> {
  try {
    const monthlyData = await getManagerMonthlyChartData(supabase, managerId, selectedMonth);
    if (!monthlyData) return;
    const latestMonthFromDb = getLatestMonthFromDb();
    const isCurrentMonth = selectedMonth === latestMonthFromDb && latestMonthFromDb !== '';
    if (isCurrentMonth) {
      await loadManagerDailyKPICard(supabase, managerId);
      await loadManagerWeeklyKPICard(supabase, managerId);
      loadManagerExpectedMonthlyKPICard(monthlyData);
    } else {
      setPlaceholder('manager-daily-current', 'manager-daily-previous', 'manager-daily-change-amount', 'manager-daily-change-rate');
      setPlaceholder('manager-weekly-current', 'manager-weekly-previous', 'manager-weekly-change-amount', 'manager-weekly-change-rate');
      setPlaceholder('manager-expected-revenue', 'manager-expected-goal', 'manager-expected-achievement');
    }
    loadManagerMonthlyKPICard(monthlyData);
  } catch (error) {
    console.error('매니저별 KPI 카드 로드 오류:', error);
  }
}
