/**
 * Dashboard KPI 카드 (일/주/월/예상) 로드
 */

import { formatDate } from '@shared/lib/utils/date';
import { formatNumberWithCommas } from '@shared/lib/utils/format';
import type { MonthlyChartData } from './dashboard-data';
import type { SupabaseClient } from '@shared/types';

const DASH_STR = '–';

function setPlaceholder(...ids: string[]): void {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = DASH_STR;
  });
}

async function loadDailyKPICard(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: lastDateData, error: lastDateError } = await supabase
      .from('ads_data_daily')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (lastDateError && (lastDateError as { code?: string }).code !== 'PGRST116') {
      console.error('Daily KPI: 마지막 날짜 조회 오류:', lastDateError);
      return;
    }

    if (!lastDateData || !(lastDateData as { date?: string }).date) return;

    const lastDate = new Date((lastDateData as { date: string }).date);
    const previousDate = new Date(lastDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const lastDateStr = formatDate(lastDate);
    const previousDateStr = formatDate(previousDate);

    const { data: dailyData, error: dailyError } = await supabase
      .from('ads_data_daily')
      .select('date, amount')
      .in('date', [lastDateStr, previousDateStr]);

    if (dailyError) {
      console.error('Daily KPI: 매출 데이터 조회 오류:', dailyError);
      return;
    }

    const revenueMap = new Map<string, number>();
    (dailyData as { date: string | Date; amount: number }[] || []).forEach((item) => {
      const dateStr =
        item.date instanceof Date
          ? formatDate(item.date)
          : typeof item.date === 'string'
            ? item.date.split('T')[0]
            : String(item.date);
      const amount = parseFloat(String(item.amount)) || 0;
      revenueMap.set(dateStr, (revenueMap.get(dateStr) || 0) + amount);
    });

    const currentRevenue = revenueMap.get(lastDateStr) || 0;
    const previousRevenue = revenueMap.get(previousDateStr) || 0;
    const changeAmount = currentRevenue - previousRevenue;
    const changeRate =
      previousRevenue > 0
        ? ((currentRevenue / previousRevenue) * 100 - 100).toFixed(1)
        : currentRevenue > 0
          ? '∞'
          : '0.0';

    const currentEl = document.getElementById('dashboard-daily-current');
    const previousEl = document.getElementById('dashboard-daily-previous');
    const changeAmountEl = document.getElementById('dashboard-daily-change-amount');
    const changeRateEl = document.getElementById('dashboard-daily-change-rate');
    if (currentEl) currentEl.textContent = formatNumberWithCommas(currentRevenue);
    if (previousEl) previousEl.textContent = formatNumberWithCommas(previousRevenue);
    if (changeAmountEl) {
      changeAmountEl.textContent = (changeAmount >= 0 ? '+' : '') + formatNumberWithCommas(changeAmount);
      changeAmountEl.className = 'KpiCard__changeAmount ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
    if (changeRateEl) {
      changeRateEl.textContent = (changeAmount >= 0 ? '+' : '') + changeRate + '%';
      changeRateEl.className = 'KpiCard__change ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
  } catch (error) {
    console.error('Daily KPI 카드 로드 오류:', error);
  }
}

async function loadWeeklyKPICard(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: weeklyViewData, error: viewError } = await supabase
      .from('ads_data_v_weekly')
      .select('week_start, weekly_amount')
      .order('week_start', { ascending: false })
      .limit(10000);

    if (viewError) {
      console.error('Weekly KPI: 주간 데이터 조회 오류:', viewError);
      return;
    }

    const rows = weeklyViewData as { week_start: string; weekly_amount: number }[] | null;
    if (!rows || rows.length === 0) return;

    const uniqueWeeks = [...new Set(rows.map((item) => item.week_start))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    if (uniqueWeeks.length < 2) return;

    const currentWeek = uniqueWeeks[0];
    const previousWeek = uniqueWeeks[1];
    const currentWeekData = rows.filter((item) => item.week_start === currentWeek);
    const previousWeekData = rows.filter((item) => item.week_start === previousWeek);
    const currentRevenue = currentWeekData.reduce((sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0), 0);
    const previousRevenue = previousWeekData.reduce((sum, item) => sum + (parseFloat(String(item.weekly_amount)) || 0), 0);
    const changeAmount = currentRevenue - previousRevenue;
    const changeRate =
      previousRevenue > 0
        ? ((currentRevenue / previousRevenue) * 100 - 100).toFixed(1)
        : currentRevenue > 0
          ? '∞'
          : '0.0';

    const currentEl = document.getElementById('dashboard-weekly-current');
    const previousEl = document.getElementById('dashboard-weekly-previous');
    const changeAmountEl = document.getElementById('dashboard-weekly-change-amount');
    const changeRateEl = document.getElementById('dashboard-weekly-change-rate');
    if (currentEl) currentEl.textContent = formatNumberWithCommas(currentRevenue);
    if (previousEl) previousEl.textContent = formatNumberWithCommas(previousRevenue);
    if (changeAmountEl) {
      changeAmountEl.textContent = (changeAmount >= 0 ? '+' : '') + formatNumberWithCommas(changeAmount);
      changeAmountEl.className = 'KpiCard__changeAmount ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
    if (changeRateEl) {
      changeRateEl.textContent = (changeAmount >= 0 ? '+' : '') + changeRate + '%';
      changeRateEl.className = 'KpiCard__change ' + (changeAmount >= 0 ? 'positive' : 'negative');
    }
  } catch (error) {
    console.error('Weekly KPI 카드 로드 오류:', error);
  }
}

function loadMonthlyKPICard(monthlyData: MonthlyChartData): void {
  try {
    const cumulativeRevenue =
      monthlyData.data.length > 0 ? monthlyData.data[monthlyData.data.length - 1].cumulative : 0;
    const monthlyGoal = monthlyData.goal || 0;
    const lastDataDay = monthlyData.lastDataDay || 0;
    const daysInMonth = monthlyData.daysInMonth || 30;
    const progressRate = daysInMonth > 0 ? ((lastDataDay / daysInMonth) * 100).toFixed(1) : '0.0';
    const achievementRate = monthlyGoal > 0 ? ((cumulativeRevenue / monthlyGoal) * 100).toFixed(1) : '0.0';

    const cumulativeEl = document.getElementById('dashboard-monthly-cumulative');
    const progressEl = document.getElementById('dashboard-monthly-progress');
    const achievementEl = document.getElementById('dashboard-monthly-achievement');
    if (cumulativeEl) cumulativeEl.textContent = formatNumberWithCommas(cumulativeRevenue);
    if (progressEl) progressEl.textContent = progressRate + '%';
    if (achievementEl) achievementEl.textContent = achievementRate + '%';
  } catch (error) {
    console.error('Monthly KPI 카드 로드 오류:', error);
  }
}

function loadExpectedMonthlyKPICard(monthlyData: MonthlyChartData): void {
  try {
    const monthlyGoal = monthlyData.goal || 0;
    const daysInMonth = monthlyData.daysInMonth || 30;
    const averageDailyRevenue = monthlyData.averageDailyRevenue || 0;
    const expectedRevenue = averageDailyRevenue * daysInMonth;
    const expectedAchievementRate =
      monthlyGoal > 0 ? ((expectedRevenue / monthlyGoal) * 100).toFixed(1) : '0.0';

    const expectedEl = document.getElementById('dashboard-expected-revenue');
    const goalEl = document.getElementById('dashboard-expected-goal');
    const achievementEl = document.getElementById('dashboard-expected-achievement');
    if (expectedEl) expectedEl.textContent = formatNumberWithCommas(Math.round(expectedRevenue));
    if (goalEl) goalEl.textContent = formatNumberWithCommas(monthlyGoal);
    if (achievementEl) achievementEl.textContent = expectedAchievementRate + '%';
  } catch (error) {
    console.error('Expected Monthly KPI 카드 로드 오류:', error);
  }
}

export async function loadDashboardKPICards(
  supabase: SupabaseClient,
  monthlyData: MonthlyChartData,
  selectedMonth: string,
  latestMonthFromDb: string
): Promise<void> {
  try {
    const isCurrentMonth = selectedMonth === latestMonthFromDb && latestMonthFromDb !== '';
    if (isCurrentMonth) {
      await loadDailyKPICard(supabase);
      await loadWeeklyKPICard(supabase);
      loadExpectedMonthlyKPICard(monthlyData);
    } else {
      setPlaceholder('dashboard-daily-current', 'dashboard-daily-previous', 'dashboard-daily-change-amount', 'dashboard-daily-change-rate');
      setPlaceholder('dashboard-weekly-current', 'dashboard-weekly-previous', 'dashboard-weekly-change-amount', 'dashboard-weekly-change-rate');
      setPlaceholder('dashboard-expected-revenue', 'dashboard-expected-goal', 'dashboard-expected-achievement');
    }
    loadMonthlyKPICard(monthlyData);
  } catch (error) {
    console.error('대시보드 KPI 카드 로드 오류:', error);
  }
}
