/**
 * 주간 리포트 — 필터 적용
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById } from '@shared/lib';
import { cleanClientName } from '@shared/lib/utils/format';
import { getClientIdsByManagerFilter } from '../shared/manager-filter';
import { applySearchFilter } from '../shared/search-filter';
import { getWeeklyWeeks } from './data';
import { calculateWeeklyStatus } from './status';
import type { WeeklyReportRow } from '../types';

export async function applyWeeklyFilters(clients: WeeklyReportRow[]): Promise<WeeklyReportRow[]> {
  const searchInput = getCachedElementById('weekly-search-input') as HTMLInputElement | null;
  const managerFilter = getCachedElementById('weekly-manager-filter') as HTMLSelectElement | null;
  const statusFilter = getCachedElementById('weekly-status-filter') as HTMLSelectElement | null;
  let filtered = [...clients];
  if (statusFilter?.value) {
    const weeks = getWeeklyWeeks();
    const statusData = calculateWeeklyStatus(clients, weeks);
    const status = statusFilter.value;
    if (status === 'active') filtered = statusData.active.currentWeek;
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
