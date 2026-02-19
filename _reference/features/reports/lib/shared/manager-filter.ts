/**
 * 담당자 필터 — 매니저 목록 셀렉트·client_id 조회
 */

import { getCachedElementById } from '@shared/lib';
import { getManagerList } from '@shared/api';
import type { SupabaseClient } from '@shared/types';

export async function loadManagerListIntoSelect(selectId: string): Promise<void> {
  const select = getCachedElementById(selectId) as HTMLSelectElement | null;
  if (!select) return;
  const managerData = await getManagerList();
  if (!managerData?.length) {
    select.innerHTML = '<option value="">담당자</option>';
    return;
  }
  select.innerHTML = '<option value="">담당자</option>';
  for (const manager of managerData) {
    const option = document.createElement('option');
    option.value = String(manager.id);
    option.textContent = manager.manager_name ?? `Manager ${manager.id}`;
    select.appendChild(option);
  }
}

interface AwaitableQueryBuilder {
  or?: (expr: string) => AwaitableQueryBuilder;
  in?: (column: string, values: number[]) => AwaitableQueryBuilder;
  eq?: (column: string, value: number) => AwaitableQueryBuilder;
}

export async function getClientIdsByManagerFilter(
  supabase: SupabaseClient,
  filterValue: string
): Promise<Set<number>> {
  const trimmed = filterValue?.trim();
  if (!trimmed) return new Set();
  const base = supabase
    .from('ads_data_client')
    .select('client_id')
    .not('manager_id', 'is', null) as unknown as AwaitableQueryBuilder;
  let query: AwaitableQueryBuilder = base;
  if (trimmed.includes(',')) {
    const managerIds = trimmed.split(',').map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
    if (managerIds.includes(99) && base.or) {
      query = base.or(`manager_id.in.(${managerIds.join(',')}),manager_id.is.null`);
    } else if (base.in) {
      query = base.in('manager_id', managerIds);
    }
  } else {
    const managerId = parseInt(trimmed, 10);
    if (isNaN(managerId)) return new Set();
    if (managerId === 99 && base.or) {
      query = base.or('manager_id.eq.99,manager_id.is.null');
    } else if (base.eq) {
      query = base.eq('manager_id', managerId);
    }
  }
  const { data, error } = await (query as Promise<{ data: { client_id: number }[] | null; error: { message: string } | null }>);
  if (error) {
    console.error('담당자 필터 조회 오류:', error);
    return new Set();
  }
  if (!data?.length) return new Set();
  return new Set(data.map((row) => row.client_id));
}
