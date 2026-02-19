/**
 * Goal Register Helpers - Revenue Calculator Module
 * 매출 계산 로직
 */

import { getSupabaseClientSafe } from '@shared/api';
import { formatDate, formatNumberWithCommas } from '@shared/lib';

export interface WeeklyDates {
  start_date: string;
  end_date: string;
}

export interface MonthlyDates {
  start_date: string;
  end_date: string;
}

declare global {
  interface Window {
    weeklyGoalState?: { datePickerState?: { selectedDate?: Date } };
  }
}

export async function recalculateStartRevenueForEdit(
  goalId: number,
  startDate: string,
  periodType: 'weekly' | 'monthly',
  calculateWeeklyDates: (d: Date) => WeeklyDates,
  calculateMonthlyDates: (d: Date) => MonthlyDates
): Promise<void> {
  if (!goalId) return;
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  try {
    const { data: targetClients } = await supabase
      .from('ads_data_goal_targetclient')
      .select('client_id')
      .eq('goal_id', goalId);

    if (!targetClients?.length) {
      await supabase
        .from('ads_data_goal')
        .update({ start_revenue: 0 })
        .eq('id', goalId);
      return;
    }

    const clientIds = (targetClients as { client_id: number }[]).map((tc) => String(tc.client_id));
    const date = new Date(startDate);

    let prevStartDate: Date;
    let prevEndDate: Date;
    if (periodType === 'weekly') {
      const goalWeek = calculateWeeklyDates(date);
      const goalWeekStart = new Date(goalWeek.start_date);
      prevStartDate = new Date(goalWeekStart);
      prevStartDate.setDate(goalWeekStart.getDate() - 7);
      prevEndDate = new Date(prevStartDate);
      prevEndDate.setDate(prevStartDate.getDate() + 6);
    } else {
      const goalMonth = calculateMonthlyDates(date);
      const goalMonthStart = new Date(goalMonth.start_date);
      prevStartDate = new Date(goalMonthStart);
      prevStartDate.setMonth(goalMonthStart.getMonth() - 1);
      prevEndDate = new Date(goalMonthStart);
      prevEndDate.setDate(0);
    }

    const startDateStr = formatDate(prevStartDate);
    const endDateStr = formatDate(prevEndDate);

    const { data: dailyData, error } = await supabase
      .from('ads_data_daily')
      .select('amount')
      .in('client_id', clientIds)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) {
      console.error('직전 주간/월간 매출 조회 오류:', error);
      return;
    }

    const totalRevenue =
      (dailyData as { amount: number }[] | null)?.reduce(
        (sum, record) => sum + (record.amount ?? 0),
        0
      ) ?? 0;

    await supabase
      .from('ads_data_goal')
      .update({ start_revenue: totalRevenue })
      .eq('id', goalId);
  } catch (err) {
    console.error('start_revenue 재계산 오류:', err);
  }
}

export async function calculateStartRevenue(
  selectedClientIds: Set<string>,
  calculateWeeklyDates: (d: Date) => WeeklyDates,
  calculateMonthlyDates: (d: Date) => MonthlyDates
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || selectedClientIds.size === 0) {
    const startRevenueInput = document.getElementById('start-revenue-input') as HTMLInputElement | null;
    if (startRevenueInput) startRevenueInput.value = '';
    return;
  }

  const datePickerState = window.weeklyGoalState?.datePickerState;
  const selectedDate = datePickerState?.selectedDate;
  if (!selectedDate) return;

  try {
    // period toggle이 제거되어 항상 weekly 모드로 동작
    const periodType: 'weekly' | 'monthly' = 'weekly';

    let prevPeriodStart: Date;
    let prevPeriodEnd: Date;

    if (periodType === 'weekly') {
      const goalWeek = calculateWeeklyDates(selectedDate);
      const goalWeekStart = new Date(goalWeek.start_date);
      prevPeriodStart = new Date(goalWeekStart);
      prevPeriodStart.setDate(goalWeekStart.getDate() - 7);
      prevPeriodEnd = new Date(prevPeriodStart);
      prevPeriodEnd.setDate(prevPeriodStart.getDate() + 6);
    } else {
      const goalMonth = calculateMonthlyDates(selectedDate);
      const goalMonthStart = new Date(goalMonth.start_date);
      prevPeriodStart = new Date(goalMonthStart);
      prevPeriodStart.setMonth(goalMonthStart.getMonth() - 1);
      prevPeriodEnd = new Date(goalMonthStart);
      prevPeriodEnd.setDate(0);
    }

    const startDate = formatDate(prevPeriodStart);
    const endDate = formatDate(prevPeriodEnd);
    const clientIdArray = Array.from(selectedClientIds).map((id) => String(id));

    const { data: dailyData, error } = await supabase
      .from('ads_data_daily')
      .select('amount')
      .in('client_id', clientIdArray)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('직전 주간/월간 매출 조회 오류:', error);
      return;
    }

    const totalRevenue =
      (dailyData as { amount: number }[] | null)?.reduce(
        (sum, record) => sum + (record.amount ?? 0),
        0
      ) ?? 0;

    const startRevenueInput = document.getElementById('start-revenue-input') as HTMLInputElement | null;
    if (startRevenueInput) {
      startRevenueInput.value = formatNumberWithCommas(String(totalRevenue));
    }
  } catch (err) {
    console.error('직전 주간/월간 매출 계산 오류:', err);
  }
}
