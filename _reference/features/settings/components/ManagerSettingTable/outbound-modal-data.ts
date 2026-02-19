/**
 * Outbound Setting Modal - 기간 데이터 로드 및 날짜 유틸
 */

import { getSupabaseClientSafe } from '@shared/api';
import { devLog } from '@shared/lib';
import type { OutboundRecord } from './outbound-modal-types';

export function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 종료일 자동 계산: 시작월 기준 +2개월의 마지막 일자 */
export function calculateEndDate(startDate: string): string {
  const [year, month] = startDate.split('-').map(Number);
  const endDateObj = new Date(year, month + 2, 0);
  return `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
}

/**
 * 현재 활성 상태인 outbound 기간 데이터를 로드하여 client_id → 가장 최근 레코드 Map으로 반환
 */
export async function loadOutboundPeriods(): Promise<Map<number, OutboundRecord>> {
  const supabase = getSupabaseClientSafe();
  const map = new Map<number, OutboundRecord>();
  if (!supabase) return map;

  try {
    const result = await (supabase
      .from('ads_data_client_outbound')
      .select('id, client_id, outbound_start, outbound_end, created_at')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: OutboundRecord[] | null; error: unknown }>);

    if (result.error || !result.data) return map;

    const today = getTodayStr();

    for (const record of result.data) {
      const numericClientId = Number(record.client_id);
      const startDate = record.outbound_start.split('T')[0];
      const endDate = record.outbound_end.split('T')[0];

      if (!map.has(numericClientId) && startDate <= today && endDate >= today) {
        map.set(numericClientId, {
          ...record,
          client_id: numericClientId,
          outbound_start: startDate,
          outbound_end: endDate,
        });
      }
    }

    return map;
  } catch (error) {
    devLog('[Outbound Modal] 기간 데이터 로드 실패:', error);
    return map;
  }
}
