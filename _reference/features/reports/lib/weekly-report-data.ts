/**
 * 주간 리포트 데이터 레이어 — API 호출 + 비즈니스 로직
 * shared/api/report-api는 Supabase 전용. 여기서 주간 범위·clientMap·비교값 계산.
 */

import type { SupabaseClient } from '@shared/types';
import { fetchWeeklyReportRows } from '@shared/api/report-api';

export interface WeeklyReportRow {
  client_id: number;
  client_name: string;
  manager_id: number | null;
  weeklyAmounts: Map<number, number>;
  mostRecentWeekAmount?: number;
  changeAmount?: number;
  weekCompareRatio?: string;
  weekCompareValue?: number;
  avgRatio?: string;
  avgValue?: number;
}

export interface WeeklyReportDataResult {
  clients: WeeklyReportRow[];
  weeks: string[];
}

let cachedWeeklyWeeks: string[] | null = null;

export function getWeeklyWeeks(): string[] {
  return cachedWeeklyWeeks ?? [];
}

/**
 * DB에서 주간 데이터 조회 후 비교값까지 계산해 반환
 */
export async function fetchWeeklyReportData(
  supabase: SupabaseClient
): Promise<WeeklyReportDataResult | null> {
  const weeklyData = await fetchWeeklyReportRows(supabase);
  if (!weeklyData?.length) return null;

  const uniqueWeeks = [...new Set(weeklyData.map((r) => r.week_start))];
  uniqueWeeks.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const weeks = uniqueWeeks.slice(0, 8);
  cachedWeeklyWeeks = weeks;

  if (weeks.length === 0) return null;

  const clientWeeklyMap = new Map<
    number,
    { client_id: number; client_name: string; manager_id: number | null; weeklyAmounts: Map<number, number> }
  >();

  for (const row of weeklyData) {
    const weekIndex = weeks.indexOf(row.week_start);
    if (weekIndex === -1) continue;
    const clientId = row.client_id;
    if (!clientWeeklyMap.has(clientId)) {
      clientWeeklyMap.set(clientId, {
        client_id: clientId,
        client_name: row.client_name ?? '',
        manager_id: row.manager_id ?? null,
        weeklyAmounts: new Map(),
      });
    }
    clientWeeklyMap.get(clientId)!.weeklyAmounts.set(weekIndex, row.weekly_amount ?? 0);
  }

  const clientsWithComparisons: WeeklyReportRow[] = Array.from(clientWeeklyMap.values()).map(
    (client) => {
      const mostRecentWeekAmount = client.weeklyAmounts.get(0) ?? 0;
      const secondWeekAmount = client.weeklyAmounts.get(1) ?? 0;
      const changeAmount = mostRecentWeekAmount - secondWeekAmount;

      let weekCompareRatio: string;
      let weekCompareValue: number;
      if (secondWeekAmount > 0) {
        weekCompareValue = (mostRecentWeekAmount / secondWeekAmount) * 100 - 100;
        weekCompareRatio = weekCompareValue.toFixed(1);
      } else if (mostRecentWeekAmount > 0) {
        weekCompareValue = Infinity;
        weekCompareRatio = '∞';
      } else {
        weekCompareValue = 0;
        weekCompareRatio = '0.0';
      }

      const amountsForAvg: number[] = [];
      for (let i = 1; i < weeks.length; i++) {
        const amount = client.weeklyAmounts.get(i) ?? 0;
        if (amount > 0) amountsForAvg.push(amount);
      }
      const avgAmount =
        amountsForAvg.length > 0
          ? amountsForAvg.reduce((s, v) => s + v, 0) / amountsForAvg.length
          : 0;
      let avgRatio: string;
      let avgValue: number;
      if (avgAmount > 0) {
        avgValue = (mostRecentWeekAmount / avgAmount) * 100 - 100;
        avgRatio = avgValue.toFixed(1);
      } else if (mostRecentWeekAmount > 0) {
        avgValue = Infinity;
        avgRatio = '∞';
      } else {
        avgValue = 0;
        avgRatio = '0.0';
      }

      return {
        ...client,
        mostRecentWeekAmount,
        changeAmount,
        weekCompareRatio,
        weekCompareValue,
        avgRatio,
        avgValue,
      };
    }
  );

  clientsWithComparisons.sort(
    (a, b) => (b.mostRecentWeekAmount ?? 0) - (a.mostRecentWeekAmount ?? 0)
  );

  return { clients: clientsWithComparisons, weeks };
}
