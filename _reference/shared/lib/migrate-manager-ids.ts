/**
 * 일괄 마이그레이션: ads_data_daily.manager_id 백필
 * ads_data_client.manager_id가 NOT NULL인데 ads_data_daily.manager_id가 NULL인 레코드를 일괄 업데이트.
 */

import { getSupabaseClient } from '@shared/api';
import { devLog } from './utils';

interface MigrationResult {
  success: boolean;
  totalClientsProcessed: number;
  totalRowsUpdated: number;
  errors: string[];
}

export async function migrateNullManagerIds(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalClientsProcessed: 0,
    totalRowsUpdated: 0,
    errors: [],
  };

  try {
    const supabase = getSupabaseClient();

    const { data: clientData, error: clientError } = await supabase
      .from('ads_data_client')
      .select('client_id, manager_id')
      .not('manager_id', 'is', null);

    if (clientError) {
      result.errors.push(`클라이언트 조회 오류: ${clientError.message}`);
      return result;
    }

    const clients = clientData as { client_id: number; manager_id: number }[] | null;
    if (!clients?.length) {
      devLog('[Migration] 업데이트 대상 클라이언트가 없습니다.');
      result.success = true;
      return result;
    }

    devLog(`[Migration] 담당자가 배정된 클라이언트 ${clients.length}개 확인`);

    const managerGroups = new Map<number, number[]>();
    for (const c of clients) {
      if (!managerGroups.has(c.manager_id)) {
        managerGroups.set(c.manager_id, []);
      }
      managerGroups.get(c.manager_id)!.push(c.client_id);
    }

    devLog(`[Migration] ${managerGroups.size}개 매니저 그룹으로 일괄 업데이트 시작`);

    for (const [managerId, clientIds] of managerGroups) {
      try {
        const { error: updateError } = await (supabase
          .from('ads_data_daily')
          .update({ manager_id: managerId })
          .in('client_id', clientIds)
          .is('manager_id', null) as unknown as Promise<{ error: { message: string } | null }>);

        if (updateError) {
          result.errors.push(`manager_id=${managerId} 업데이트 오류: ${updateError.message}`);
          devLog(`[Migration] manager_id=${managerId}: 오류 - ${updateError.message}`);
        } else {
          result.totalClientsProcessed += clientIds.length;
          devLog(`[Migration] manager_id=${managerId}: ${clientIds.length}개 클라이언트 처리 완료`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        result.errors.push(`manager_id=${managerId} 예외: ${msg}`);
      }
    }

    result.success = result.errors.length === 0;
    devLog(
      `[Migration] 마이그레이션 완료: ${result.totalClientsProcessed}개 클라이언트 처리` +
      (result.errors.length > 0 ? `, ${result.errors.length}개 오류` : '')
    );
  } catch (err) {
    result.errors.push(`마이그레이션 예외: ${(err as Error).message}`);
  }

  return result;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).migrateNullManagerIds = migrateNullManagerIds;
}
