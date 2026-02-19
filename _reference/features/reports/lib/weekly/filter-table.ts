/**
 * 주간 리포트 — 캐시 기반 재렌더
 */

import { getCachedElementById } from '@shared/lib';
import { loadWeeklyReport } from './load';
import { calculateWeeklyStatus } from './status';
import { updateWeeklyStatusCards } from './status';
import { applyWeeklyFilters } from './filters';
import { sortWeeklyClients, updateAllWeeklyHeaderIcons, getWeeklySortState } from './sort';
import { renderWeeklyBody } from './table';

export async function filterWeeklyReportTable(): Promise<void> {
  const tbody = getCachedElementById('weekly-report-tbody');
  const thead = getCachedElementById('weekly-report-thead');
  if (!tbody || !thead) return;
  const cache = window.weeklyReportDataCache;
  if (!cache?.clients) {
    await loadWeeklyReport();
    return;
  }
  const { clients, weeks } = cache;
  const filteredClients = await applyWeeklyFilters(clients);
  const sortState = getWeeklySortState();
  const sortedClients = sortWeeklyClients(filteredClients, sortState.column);
  const statusData = calculateWeeklyStatus(sortedClients, weeks);
  updateWeeklyStatusCards(statusData);
  updateAllWeeklyHeaderIcons();
  tbody.innerHTML = '';
  renderWeeklyBody(tbody as HTMLElement, sortedClients, weeks);
}
