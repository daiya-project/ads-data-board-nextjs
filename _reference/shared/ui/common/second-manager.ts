/**
 * 보조 담당자(second_manager_id) 추가 매출 집계 — 공유 유틸
 *
 * manager_id = 3 (Jongmin Lee) 선택 시,
 * ads_data_client.second_manager_id = 3 인 클라이언트의 매출도 함께 집계한다.
 *
 * 로직:
 *   1. ads_data_client에서 second_manager_id = 3 AND manager_id ≠ 3 인 client_id 목록 조회
 *   2. ads_data_daily에서 해당 client_id들의 매출을 날짜별로 집계
 *   3. 기존 manager_id=3 결과와 합산
 */

import type { SupabaseClient } from '../../../types/index';

/** 보조 담당자 로직이 적용되는 매니저 ID */
export const SECOND_MANAGER_TARGET_ID = 3;

/** 보조 담당자 로직 적용 대상인지 확인 */
export function isSecondManagerTarget(managerId: number | null): boolean {
  return managerId === SECOND_MANAGER_TARGET_ID;
}

/**
 * second_manager_id = targetId AND manager_id ≠ targetId 인 client_id 목록 조회
 */
export async function fetchSecondManagerClientIds(
  supabase: SupabaseClient,
  targetManagerId: number
): Promise<number[]> {
  const result = await (supabase
    .from('ads_data_client')
    .select('client_id')
    .eq('second_manager_id', targetManagerId)
    .neq('manager_id', targetManagerId) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (result.error) {
    console.error('[SecondManager] client_id 조회 오류:', result.error);
    return [];
  }

  const rows = result.data as { client_id: number }[] | null;
  return rows?.map((r) => r.client_id) ?? [];
}

/**
 * ads_data_daily에서 특정 client_id 목록의 일별 매출 합산 조회
 * @returns Map<날짜문자열, 매출합산>
 */
export async function fetchDailyAmountByClientIds(
  supabase: SupabaseClient,
  clientIds: number[],
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (clientIds.length === 0) return map;

  const result = await (supabase
    .from('ads_data_daily')
    .select('date, amount')
    .in('client_id', clientIds)
    .gte!('date', startDate)
    .lte!('date', endDate)
    .order('date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (result.error) {
    console.error('[SecondManager] daily amount 조회 오류:', result.error);
    return map;
  }

  const rows = result.data as { date: string; amount: number }[] | null;
  if (!rows) return map;

  for (const row of rows) {
    const dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : String(row.date);
    const amt = parseFloat(String(row.amount)) || 0;
    map.set(dateStr, (map.get(dateStr) ?? 0) + amt);
  }

  return map;
}

/**
 * ads_data_v_weekly 뷰와 동일한 구조로 weekly 데이터를 client_id 기준 추가 조회
 * ads_data_daily에서 주차별 합산 + 고유 클라이언트 수 계산
 */
export async function fetchWeeklyAmountByClientIds(
  supabase: SupabaseClient,
  clientIds: number[],
  weekStarts: string[]
): Promise<{ week_start: string; weekly_amount: number; client_id: number }[]> {
  if (clientIds.length === 0 || weekStarts.length === 0) return [];

  // shared_week에서 주차 정보 조회
  const weekResult = await (supabase
    .from('shared_week')
    .select('start_date, end_date')
    .in('start_date', weekStarts)
    .order('start_date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (weekResult.error || !weekResult.data) return [];
  const weekRanges = weekResult.data as { start_date: string; end_date: string }[];
  if (weekRanges.length === 0) return [];

  // 전체 기간의 시작~끝
  const globalStart = weekRanges[0].start_date;
  const globalEnd = weekRanges[weekRanges.length - 1].end_date;

  // ads_data_daily에서 해당 client_id들의 데이터 조회
  const dailyResult = await (supabase
    .from('ads_data_daily')
    .select('date, amount, client_id')
    .in('client_id', clientIds)
    .gte!('date', globalStart)
    .lte!('date', globalEnd)
    .order('date', { ascending: true }) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (dailyResult.error || !dailyResult.data) return [];
  const dailyRows = dailyResult.data as { date: string; amount: number; client_id: number }[];

  // 각 일별 데이터를 주차에 매핑
  const result: { week_start: string; weekly_amount: number; client_id: number }[] = [];

  for (const wr of weekRanges) {
    // 이 주차에 해당하는 일별 데이터 필터
    const weekDailyRows = dailyRows.filter((r) => {
      const d = typeof r.date === 'string' ? r.date.split('T')[0] : String(r.date);
      return d >= wr.start_date && d <= wr.end_date;
    });

    // client_id별 주간 합산
    const clientWeeklyMap = new Map<number, number>();
    for (const r of weekDailyRows) {
      const amt = parseFloat(String(r.amount)) || 0;
      clientWeeklyMap.set(r.client_id, (clientWeeklyMap.get(r.client_id) ?? 0) + amt);
    }

    // 결과 행 생성
    for (const [clientId, weeklyAmount] of clientWeeklyMap) {
      result.push({
        week_start: wr.start_date,
        weekly_amount: weeklyAmount,
        client_id: clientId,
      });
    }
  }

  return result;
}
