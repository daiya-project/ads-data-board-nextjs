/**
 * API 서비스
 * Supabase 데이터베이스 쿼리 관련 함수들을 제공합니다.
 */

import { getSupabaseClientSafe } from './supabase-client';
import { requestManager, createRequestKey } from '../lib/request-manager';
import type { ManagerRow, ClientRow } from '@shared/types';

// 캐시 TTL 설정
const MANAGER_CACHE_TTL = 5 * 60 * 1000; // 5분
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * 매니저 목록을 가져옵니다.
 * 요청 중복 제거 및 캐싱이 적용됩니다.
 */
export async function getManagerList(): Promise<ManagerRow[] | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  const requestKey = createRequestKey('shared_manager', 'ads');

  try {
    return await requestManager.execute<ManagerRow[] | null>(
      requestKey,
      async () => {
        const { data: managerData, error } = await supabase
          .from('shared_manager')
          .select('id, manager_name')
          .eq('manager_team', 'ads')
          .order('id', { ascending: true });

        if (error) {
          console.error('Manager 목록 조회 오류:', error);
          return null;
        }

        return (managerData ?? []) as ManagerRow[];
      },
      { cacheTtl: MANAGER_CACHE_TTL }
    );
  } catch (err) {
    console.error('Manager 목록 로드 오류:', err);
    return null;
  }
}

/**
 * 클라이언트 목록을 가져옵니다.
 * 요청 중복 제거 및 캐싱이 적용됩니다.
 */
export async function getClientList(managerId: number): Promise<ClientRow[] | null> {
  if (!managerId) return null;

  const supabase = getSupabaseClientSafe();
  if (!supabase) return null;

  const requestKey = createRequestKey('clients', managerId);

  try {
    return await requestManager.execute<ClientRow[] | null>(
      requestKey,
      async () => {
        const { data: clients, error } = await supabase
          .from('ads_data_client')
          .select('client_id, client_name')
          .eq('manager_id', managerId)
          .order('client_id', { ascending: true });

        if (error) {
          console.error('광고주 목록 조회 오류:', error);
          return null;
        }

        return (clients ?? []) as ClientRow[];
      },
      { cacheTtl: CLIENT_CACHE_TTL }
    );
  } catch (err) {
    console.error('광고주 목록 로드 오류:', err);
    return null;
  }
}

/**
 * 특정 매니저의 클라이언트 캐시를 무효화합니다.
 */
export function invalidateClientCache(managerId: number): void {
  const requestKey = createRequestKey('clients', managerId);
  requestManager.invalidateCache(requestKey);
}

/**
 * 매니저 캐시를 무효화합니다.
 */
export function invalidateManagerCache(): void {
  requestManager.invalidateCacheByPrefix('shared_manager:');
}
