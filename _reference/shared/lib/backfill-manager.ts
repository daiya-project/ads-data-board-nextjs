/**
 * Backfill Manager ID
 *
 * ads_data_client.manager_id가 변경될 때,
 * 해당 클라이언트의 과거 ads_data_daily 레코드 중
 * manager_id가 NULL인 행을 새 값으로 업데이트한다.
 */

import { devLog } from './utils';

interface SupabaseClientLike {
  from: (table: string) => unknown;
}

/**
 * 단일 클라이언트의 과거 ads_data_daily.manager_id를 백필
 */
export async function backfillManagerForClient(
  supabase: SupabaseClientLike,
  clientId: number,
  newManagerId: number | null
): Promise<number> {
  if (newManagerId === null) return 0;

  try {
    const result = await ((supabase
      .from('ads_data_daily') as Record<string, unknown> & {
        update: (data: Record<string, unknown>) => {
          eq: (col: string, val: unknown) => {
            is: (col: string, val: null) => Promise<{ data: unknown; error: unknown; count?: number }>;
          };
        };
      })
      .update({ manager_id: newManagerId })
      .eq('client_id', clientId)
      .is('manager_id', null) as unknown as Promise<{ data: unknown; error: unknown; count?: number }>);

    if (result.error) {
      console.error(`[Backfill] client_id=${clientId} 백필 오류:`, result.error);
      return 0;
    }

    const updatedCount = typeof result.count === 'number' ? result.count : -1;
    devLog(
      `[Backfill] client_id=${clientId}: manager_id=${newManagerId}로 과거 데이터 백필 완료` +
      (updatedCount >= 0 ? ` (${updatedCount}건)` : '')
    );
    return updatedCount >= 0 ? updatedCount : 0;
  } catch (err) {
    console.error(`[Backfill] client_id=${clientId} 백필 예외:`, err);
    return 0;
  }
}

/**
 * 여러 클라이언트의 과거 ads_data_daily.manager_id를 일괄 백필
 */
export async function backfillManagerForClients(
  supabase: SupabaseClientLike,
  clientIds: number[],
  newManagerId: number | null
): Promise<number> {
  if (newManagerId === null || clientIds.length === 0) return 0;

  try {
    const result = await ((supabase
      .from('ads_data_daily') as Record<string, unknown> & {
        update: (data: Record<string, unknown>) => {
          in: (col: string, vals: unknown[]) => {
            is: (col: string, val: null) => Promise<{ data: unknown; error: unknown; count?: number }>;
          };
        };
      })
      .update({ manager_id: newManagerId })
      .in('client_id', clientIds)
      .is('manager_id', null) as unknown as Promise<{ data: unknown; error: unknown; count?: number }>);

    if (result.error) {
      console.error(`[Backfill] 일괄 백필 오류:`, result.error);
      return 0;
    }

    const updatedCount = typeof result.count === 'number' ? result.count : -1;
    devLog(
      `[Backfill] ${clientIds.length}개 클라이언트: manager_id=${newManagerId}로 과거 데이터 백필 완료` +
      (updatedCount >= 0 ? ` (${updatedCount}건)` : '')
    );
    return updatedCount >= 0 ? updatedCount : 0;
  } catch (err) {
    console.error(`[Backfill] 일괄 백필 예외:`, err);
    return 0;
  }
}
