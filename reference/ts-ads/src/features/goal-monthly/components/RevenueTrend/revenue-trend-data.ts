/**
 * Revenue Trend - 데이터 조회/계산
 */

import type { SupabaseClient } from '@shared/types';
import { devLog } from '@shared/lib';
import type { DailyAmountRow, ClientDailyData, TrendItem, TrendDirection } from './revenue-trend-types';
import { TREND_LIST_COUNT } from './revenue-trend-constants';

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 선택된 매니저의 최근 7일 일별 매출 데이터 조회
 */
export async function fetchDailyRevenueData(
  supabase: SupabaseClient,
  managerId: number | null,
  selectedMonth: string
): Promise<{ dates: string[]; clientDataMap: Map<number, ClientDailyData> }> {
  const [y, m] = selectedMonth.split('-').map(Number);
  const endDate = new Date(y, m, 0);
  const today = new Date();
  const effectiveEnd = endDate < today ? endDate : today;
  const endDateStr = formatDateStr(effectiveEnd);

  const startDate = new Date(effectiveEnd);
  startDate.setDate(startDate.getDate() - 6);
  const startDateStr = formatDateStr(startDate);

  devLog('[RevenueTrend] 조회 기간:', startDateStr, '~', endDateStr);

  let query = supabase
    .from('ads_data_daily')
    .select('date, amount, client_id')
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }

  const result = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  if (result.error) {
    devLog('[RevenueTrend] 데이터 조회 오류:', result.error);
    return { dates: [], clientDataMap: new Map() };
  }

  const rows = (result.data as DailyAmountRow[]) ?? [];

  const dateSet = new Set<string>();
  rows.forEach((r) => dateSet.add(r.date));
  const dates = [...dateSet].sort();

  const clientDataMap = new Map<number, ClientDailyData>();
  for (const row of rows) {
    if (!clientDataMap.has(row.client_id)) {
      clientDataMap.set(row.client_id, {
        clientId: row.client_id,
        clientName: '',
        dailyAmounts: new Map(),
      });
    }
    const client = clientDataMap.get(row.client_id)!;
    const existing = client.dailyAmounts.get(row.date) ?? 0;
    client.dailyAmounts.set(row.date, existing + (row.amount ?? 0));
  }

  return { dates, clientDataMap };
}

/**
 * 클라이언트 이름 보강
 */
export async function enrichClientNames(
  supabase: SupabaseClient,
  clientDataMap: Map<number, ClientDailyData>
): Promise<void> {
  const clientIds = [...clientDataMap.keys()];
  if (clientIds.length === 0) return;

  const { data, error } = await supabase
    .from('ads_data_client')
    .select('client_id, client_name')
    .in('client_id', clientIds);

  if (error || !data) return;

  for (const row of data as { client_id: number; client_name: string }[]) {
    const client = clientDataMap.get(row.client_id);
    if (client) {
      client.clientName = row.client_name ?? `Client ${row.client_id}`;
    }
  }
}

/**
 * 일별 전체 매출 합계 계산 (차트용)
 */
export function calculateDailyTotals(
  dates: string[],
  clientDataMap: Map<number, ClientDailyData>
): number[] {
  return dates.map((date) => {
    let total = 0;
    for (const client of clientDataMap.values()) {
      total += client.dailyAmounts.get(date) ?? 0;
    }
    return total;
  });
}

/**
 * 일별 변화량 계산 (전일 대비)
 */
export function calculateDailyChanges(dailyTotals: number[]): number[] {
  return dailyTotals.map((val, i) => {
    if (i === 0) return 0;
    return val - dailyTotals[i - 1];
  });
}

/**
 * 증감 상위 광고주 리스트 계산
 */
export function calculateTrendList(
  dates: string[],
  clientDataMap: Map<number, ClientDailyData>,
  direction: TrendDirection
): TrendItem[] {
  if (dates.length < 2) return [];

  const latestDate = dates[dates.length - 1];
  const previousDate = dates[dates.length - 2];

  const items: TrendItem[] = [];

  for (const client of clientDataMap.values()) {
    const recentAmount = client.dailyAmounts.get(latestDate) ?? 0;
    const previousAmount = client.dailyAmounts.get(previousDate) ?? 0;
    const changeAmount = recentAmount - previousAmount;

    if (recentAmount < 10000 && previousAmount < 10000) continue;

    const changeRate =
      previousAmount === 0
        ? recentAmount === 0
          ? 0
          : direction === 'up'
          ? 100
          : -100
        : ((recentAmount / previousAmount) - 1) * 100;

    items.push({
      clientId: client.clientId,
      clientName: client.clientName || `Client ${client.clientId}`,
      recentAmount,
      previousAmount,
      changeAmount,
      changeRate,
    });
  }

  const filtered = items.filter((item) => {
    if (direction === 'up') return item.changeRate > 0;
    return item.changeRate < 0;
  });

  filtered.sort((a, b) => {
    if (direction === 'up') return b.changeRate - a.changeRate;
    return a.changeRate - b.changeRate;
  });

  return filtered.slice(0, TREND_LIST_COUNT);
}
