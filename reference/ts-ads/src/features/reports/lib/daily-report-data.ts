/**
 * 일별 리포트 데이터 레이어 — API 호출 + 비즈니스 로직
 * shared/api/report-api는 Supabase 전용. 여기서 날짜 범위·clientMap·비교값 계산.
 */

import type { SupabaseClient } from '@shared/types';
import {
  fetchLastReportDate,
  fetchHolidaysInRange,
  fetchDailyReportRows,
} from '@shared/api/report-api';

export interface DailyReportRow {
  client_id: number;
  client_name: string;
  manager_id: number | null;
  amounts: Map<string, number>;
  mostRecentAmount?: number;
  changeAmount?: number;
  dayBeforeRatio?: string;
  dayBeforeValue?: number;
  avgRatio?: string;
  avgValue?: number;
}

export interface DailyReportDataResult {
  clients: DailyReportRow[];
  dateRange: string[];
  holidays: Set<string>;
}

let cachedDailyDateRange: string[] | null = null;

export function getDailyDateRange(): string[] {
  return cachedDailyDateRange ?? [];
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * DB에서 일별 데이터 조회 후 비교값까지 계산해 반환
 */
export async function fetchDailyReportData(
  supabase: SupabaseClient
): Promise<DailyReportDataResult | null> {
  const lastDate = await fetchLastReportDate(supabase);
  if (!lastDate) return null;

  const dateRange: string[] = [];
  const last = new Date(lastDate);
  for (let i = 0; i < 14; i++) {
    const d = new Date(last);
    d.setDate(d.getDate() - i);
    dateRange.push(d.toISOString().split('T')[0]);
  }

  cachedDailyDateRange = dateRange;

  const holidays = await fetchHolidaysInRange(supabase, dateRange);
  const dailyData = await fetchDailyReportRows(supabase, dateRange);

  const clientDataMap = new Map<
    number,
    { client_id: number; client_name: string; manager_id: number | null; amounts: Map<string, number> }
  >();

  for (const row of dailyData) {
    const clientId = row.client_id;
    if (!clientDataMap.has(clientId)) {
      clientDataMap.set(clientId, {
        client_id: clientId,
        client_name: row.client_name ?? '',
        manager_id: row.manager_id ?? null,
        amounts: new Map(),
      });
    }
    clientDataMap.get(clientId)!.amounts.set(row.date, row.amount ?? 0);
  }

  const mostRecentDate = dateRange[0];
  const dayBeforeDate = dateRange[1];

  const clientsWithComparisons: DailyReportRow[] = Array.from(clientDataMap.values()).map(
    (client) => {
      const mostRecentAmount = client.amounts.get(mostRecentDate) ?? 0;
      const dayBeforeAmount = client.amounts.get(dayBeforeDate) ?? 0;
      const changeAmount = mostRecentAmount - dayBeforeAmount;

      let dayBeforeRatio: string;
      let dayBeforeValue: number;
      if (dayBeforeAmount > 0) {
        dayBeforeValue = (mostRecentAmount / dayBeforeAmount) * 100 - 100;
        dayBeforeRatio = dayBeforeValue.toFixed(1);
      } else if (mostRecentAmount > 0) {
        dayBeforeValue = Infinity;
        dayBeforeRatio = '∞';
      } else {
        dayBeforeValue = 0;
        dayBeforeRatio = '0.0';
      }

      const amountsForAvg: number[] = [];
      for (let i = 1; i < dateRange.length; i++) {
        const date = dateRange[i];
        if (!isWeekend(date)) {
          const amount = client.amounts.get(date) ?? 0;
          if (amount > 0) amountsForAvg.push(amount);
        }
      }
      const avgAmount =
        amountsForAvg.length > 0
          ? amountsForAvg.reduce((s, v) => s + v, 0) / amountsForAvg.length
          : 0;
      let avgRatio: string;
      let avgValue: number;
      if (avgAmount > 0) {
        avgValue = (mostRecentAmount / avgAmount) * 100 - 100;
        avgRatio = avgValue.toFixed(1);
      } else if (mostRecentAmount > 0) {
        avgValue = Infinity;
        avgRatio = '∞';
      } else {
        avgValue = 0;
        avgRatio = '0.0';
      }

      return {
        ...client,
        mostRecentAmount,
        changeAmount,
        dayBeforeRatio,
        dayBeforeValue,
        avgRatio,
        avgValue,
      };
    }
  );

  clientsWithComparisons.sort((a, b) => (b.mostRecentAmount ?? 0) - (a.mostRecentAmount ?? 0));

  return { clients: clientsWithComparisons, dateRange, holidays };
}
