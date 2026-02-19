/**
 * Outbound Section - 데이터 조회
 */

import { getSupabaseClientSafe } from '@shared/api';
import { devLog, handleError } from '@shared/lib';
import type {
  Outbound3MonthChartData,
  OutboundViewRow,
  OutboundWeeklyInfo,
  OutboundMonthlyCardData,
} from './outbound-types';
import { generateDateRange } from './outbound-format';

/** 가장 최근 날짜 조회 */
export async function getMostRecentDate(): Promise<string | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  try {
    const result = await (supabase
      .from('ads_data_daily')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single() as unknown as Promise<{ data: unknown; error: unknown }>);

    if (result.error || !result.data) return null;
    const row = result.data as { date: string };
    return row.date ? row.date.split('T')[0] : null;
  } catch (error) {
    devLog('[Outbound] getMostRecentDate 실패:', error);
    return null;
  }
}

/**
 * 3개월 듀얼 축 차트 데이터 조회 (일별)
 * 좌축: 일별 매출 합산, 우축: 일별 신규 광고주 수
 */
export async function getNewAdvertiser3MonthChartData(
  recentDate: string
): Promise<Outbound3MonthChartData | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  try {
    const currentMonth = recentDate.substring(0, 7);
    const [cy, cm] = currentMonth.split('-').map(Number);
    const month2Ago = new Date(cy, cm - 1 - 2, 1);
    const monthEnd = new Date(cy, cm, 0);

    const globalStart = `${month2Ago.getFullYear()}-${String(month2Ago.getMonth() + 1).padStart(2, '0')}-01`;
    const globalEnd = `${cy}-${String(cm).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

    const viewResult = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, date, amount, outbound_start, outbound_end')
      .gte!('date', globalStart)
      .lte!('date', globalEnd)
      .gte!('outbound_start', globalStart)
      .lte!('outbound_start', globalEnd)
      .order('date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (viewResult.error || !viewResult.data) {
      devLog('[Outbound] 뷰 조회 실패:', viewResult.error);
      return null;
    }

    const rows = viewResult.data as OutboundViewRow[];
    if (rows.length === 0) return null;

    const dailyRevenueMap = new Map<string, number>();
    const dailyClientMap = new Map<string, Set<number>>();

    for (const row of rows) {
      const dateStr = (row.date as string).split('T')[0];
      const amt = parseFloat(String(row.amount)) || 0;
      dailyRevenueMap.set(dateStr, (dailyRevenueMap.get(dateStr) ?? 0) + amt);

      if (amt > 0) {
        if (!dailyClientMap.has(dateStr)) dailyClientMap.set(dateStr, new Set());
        dailyClientMap.get(dateStr)!.add(row.client_id);
      }
    }

    const allDates = generateDateRange(globalStart, globalEnd);

    const labels = allDates.map(d => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`;
    });

    const recentDateClean = recentDate.split('T')[0];
    let lastDataIndex = allDates.indexOf(recentDateClean);
    if (lastDataIndex < 0) {
      for (let i = allDates.length - 1; i >= 0; i--) {
        if (dailyRevenueMap.has(allDates[i])) {
          lastDataIndex = i;
          break;
        }
      }
    }
    if (lastDataIndex < 0) lastDataIndex = 0;

    const dailyValues: (number | null)[] = [];
    const clientCounts: (number | null)[] = [];

    for (let i = 0; i < allDates.length; i++) {
      if (i <= lastDataIndex) {
        const dateStr = allDates[i];
        dailyValues.push(dailyRevenueMap.get(dateStr) ?? 0);
        clientCounts.push(dailyClientMap.get(dateStr)?.size ?? 0);
      } else {
        dailyValues.push(null);
        clientCounts.push(null);
      }
    }

    return {
      labels,
      dates: allDates,
      dailyValues,
      clientCounts,
      lastDataIndex,
    };
  } catch (error) {
    devLog('[Outbound] 3개월 차트 데이터 조회 실패:', error);
    return null;
  }
}

/**
 * 3개월 듀얼 축 차트 데이터 조회 (주간)
 * 일별 데이터를 주간으로 집계
 */
export async function getNewAdvertiserWeeklyChartData(
  recentDate: string
): Promise<{ chartData: Outbound3MonthChartData; weekRanges: OutboundWeeklyInfo[] } | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  try {
    const currentMonth = recentDate.substring(0, 7);
    const [cy, cm] = currentMonth.split('-').map(Number);
    const month2Ago = new Date(cy, cm - 1 - 2, 1);
    const monthEnd = new Date(cy, cm, 0);

    const globalStart = `${month2Ago.getFullYear()}-${String(month2Ago.getMonth() + 1).padStart(2, '0')}-01`;
    const globalEnd = `${cy}-${String(cm).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

    const weekResult = await (supabase
      .from('shared_week')
      .select('week_id, week_number, year, start_date, end_date')
      .lte!('start_date', globalEnd)
      .gte!('end_date', globalStart)
      .order('start_date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (weekResult.error || !weekResult.data) {
      devLog('[Outbound] shared_week 조회 실패:', weekResult.error);
      return null;
    }

    const weeks = weekResult.data as {
      week_id: string;
      week_number: number;
      year: number;
      start_date: string;
      end_date: string;
    }[];

    if (weeks.length === 0) return null;

    const viewResult = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, date, amount, outbound_start, outbound_end')
      .gte!('date', globalStart)
      .lte!('date', globalEnd)
      .gte!('outbound_start', globalStart)
      .lte!('outbound_start', globalEnd)
      .order('date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (viewResult.error || !viewResult.data) {
      devLog('[Outbound] 주간 뷰 조회 실패:', viewResult.error);
      return null;
    }

    const rows = viewResult.data as OutboundViewRow[];

    const recentDateClean = recentDate.split('T')[0];
    const labels: string[] = [];
    const dates: string[] = [];
    const weeklyValues: (number | null)[] = [];
    const clientCounts: (number | null)[] = [];
    const weekRanges: OutboundWeeklyInfo[] = [];
    let lastDataIndex = 0;

    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      const wStart = (w.start_date as string).split('T')[0];
      const wEnd = (w.end_date as string).split('T')[0];

      weekRanges.push({ start: wStart, end: wEnd });
      dates.push(wStart);

      const startParts = wStart.split('-');
      labels.push(`${startParts[1]}/${startParts[2]}`);

      if (wStart > recentDateClean) {
        weeklyValues.push(null);
        clientCounts.push(null);
      } else {
        lastDataIndex = i;

        let weekRevenue = 0;
        const weekClients = new Set<number>();

        for (const row of rows) {
          const dateStr = (row.date as string).split('T')[0];
          if (dateStr >= wStart && dateStr <= wEnd) {
            const amt = parseFloat(String(row.amount)) || 0;
            weekRevenue += amt;
            if (amt > 0) weekClients.add(row.client_id);
          }
        }

        weeklyValues.push(weekRevenue);
        clientCounts.push(weekClients.size);
      }
    }

    return {
      chartData: {
        labels,
        dates,
        dailyValues: weeklyValues,
        clientCounts,
        lastDataIndex,
      },
      weekRanges,
    };
  } catch (error) {
    devLog('[Outbound] 주간 차트 데이터 조회 실패:', error);
    return null;
  }
}

/**
 * 월별 카드 데이터 조회
 * 3개월간 월별 매출 및 활성 광고주 수 집계
 */
export async function getOutboundMonthlyCardData(): Promise<OutboundMonthlyCardData[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return [];

  try {
    const recentDate = await getMostRecentDate();
    if (!recentDate) return [];

    const currentMonth = recentDate.substring(0, 7);
    const [year, month] = currentMonth.split('-').map(Number);

    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const globalStart = `${months[0]}-01`;
    const lastM = months[months.length - 1];
    const globalEnd = new Date(parseInt(lastM.split('-')[0]), parseInt(lastM.split('-')[1]), 0)
      .toISOString().slice(0, 10);

    const viewResult = await (supabase
      .from('ads_data_v_outbound')
      .select('client_id, date, amount')
      .gte!('date', globalStart)
      .lte!('date', globalEnd)
      .order('date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

    if (viewResult.error || !viewResult.data) return [];
    const rows = viewResult.data as { client_id: number; date: string; amount: number }[];

    return months.map((m) => {
      const monthRows = rows.filter(r => (r.date as string).split('T')[0].substring(0, 7) === m);
      const revenue = monthRows.reduce((s, r) => s + (parseFloat(String(r.amount)) || 0), 0);
      const activeClients = new Set(
        monthRows.filter(r => (parseFloat(String(r.amount)) || 0) > 0).map(r => r.client_id)
      ).size;
      return { month: m, revenue, activeClients };
    });
  } catch (error) {
    devLog('[Outbound] 3개월 카드 데이터 조회 실패:', error);
    handleError(error as Error, 'outbound-section');
    return [];
  }
}
