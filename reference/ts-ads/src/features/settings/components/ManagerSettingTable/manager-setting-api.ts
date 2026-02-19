/**
 * Manager Setting Table - 데이터 조회 및 API
 */

import { getSupabaseClientSafe } from '@shared/api';
import { handleError, devLog } from '@shared/lib';
import type { ManagerSettingClient } from './manager-setting-types';

export interface ManagerSettingData {
  clients: ManagerSettingClient[];
  managerMap: Map<number, string>;
}

/**
 * @returns 데이터가 없으면 null, 오류 시 throw
 */
export async function fetchManagerSettingData(
  showUnassignedOnly: boolean
): Promise<ManagerSettingData | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(
      new Error('Supabase 클라이언트가 초기화되지 않았습니다.'),
      'fetchManagerSettingData'
    );
    return null;
  }

  let query = supabase
    .from('ads_data_client')
    .select('client_id, client_name, manager_id, second_manager_id, outbound, created_at')
    .order('client_id', { ascending: true });

  if (showUnassignedOnly) {
    query = query.is('manager_id', null);
  }

  const { data: clientData, error } = await query;

  if (error) throw new Error(`데이터 조회 오류: ${error.message}`);

  if (!clientData?.length) {
    return null;
  }

  const clients = clientData as ManagerSettingClient[];

  const { data: managerData, error: managerError } = await supabase
    .from('shared_manager')
    .select('id, manager_name')
    .eq('manager_team', 'ads')
    .in('id', [1, 2, 3, 4, 5, 98])
    .order('id', { ascending: true });

  if (managerError) {
    console.error('Manager 데이터 조회 오류:', managerError);
  }

  const managerMap = new Map<number, string>();
  if (managerData?.length) {
    for (const manager of managerData as { id: number; manager_name: string }[]) {
      managerMap.set(manager.id, manager.manager_name ?? `Manager ${manager.id}`);
    }
    if (!managerMap.has(98)) managerMap.set(98, 'Manager 98');
  } else {
    for (let i = 1; i <= 5; i++) managerMap.set(i, `Manager ${i}`);
    managerMap.set(98, 'Manager 98');
  }

  return { clients, managerMap };
}

export async function updateClientManager(
  clientId: number,
  managerId: number | null
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(
      new Error('Supabase 클라이언트가 초기화되지 않았습니다.'),
      'updateClientManager'
    );
    return;
  }

  try {
    const { error } = await supabase
      .from('ads_data_client')
      .update({ manager_id: managerId })
      .eq('client_id', clientId);

    if (error) throw new Error(`Manager 업데이트 오류: ${error.message}`);
    devLog(`Client ${clientId}의 Manager가 ${managerId}로 업데이트되었습니다.`);
  } catch (err) {
    console.error('updateClientManager 오류:', err);
    throw (err as Error).message;
  }
}
