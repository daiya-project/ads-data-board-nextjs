/**
 * 일별 리포트 — 필터 적용 (Status·검색·담당자)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById } from '@shared/lib';
import { cleanClientName } from '@shared/lib/utils/format';
import { getClientIdsByManagerFilter } from '../shared/manager-filter';
import { applySearchFilter } from '../shared/search-filter';
import { getDailyDateRange } from './data';
import { calculateDailyStatus } from './status';
import type { DailyReportRow } from '../types';

export async function applyDailyFilters(clients: DailyReportRow[]): Promise<DailyReportRow[]> {
  const searchInput = getCachedElementById('daily-search-input') as HTMLInputElement | null;
  const managerFilter = getCachedElementById('daily-manager-filter') as HTMLSelectElement | null;
  const statusFilter = getCachedElementById('daily-status-filter') as HTMLSelectElement | null;
  let filtered = [...clients];
  if (statusFilter?.value) {
    const dateRange = getDailyDateRange();
    const statusData = calculateDailyStatus(clients, dateRange);
    const status = statusFilter.value;
    if (status === 'active') filtered = statusData.active.today;
    else if (status === 'new') filtered = statusData.new.clients;
    else if (status === 'stopped') filtered = statusData.stopped.clients;
    else if (status === 'rising') filtered = statusData.rising.clients;
    else if (status === 'falling') filtered = statusData.falling.clients;
  }
  if (searchInput?.value.trim()) {
    filtered = applySearchFilter(
      filtered,
      searchInput.value.trim(),
      (c) => `${c.client_id} ${cleanClientName(c.client_name)}`
    );
  }
  if (managerFilter?.value) {
    const supabase = getSupabaseClientSafe();
    if (!supabase) return filtered;
    try {
      const allowedIds = await getClientIdsByManagerFilter(supabase, managerFilter.value);
      if (allowedIds.size > 0) filtered = filtered.filter((c) => allowedIds.has(c.client_id));
      else filtered = [];
    } catch (err) {
      console.error('담당자 필터 처리 오류:', err);
    }
  }
  return filtered;
}
