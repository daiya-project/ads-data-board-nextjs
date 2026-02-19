/**
 * 일별 리포트 — 캐시 기반 재렌더 (필터/정렬 후 테이블만 갱신)
 */

import { getCachedElementById } from '@shared/lib';
import { loadDailyReport } from './load';
import { calculateDailyStatus } from './status';
import { updateDailyStatusCards } from './status';
import { applyDailyFilters } from './filters';
import { sortDailyClients, updateAllDailyHeaderIcons, getDailySortState } from './sort';
import { renderDailyBody } from './table';

export async function filterDailyReportTable(): Promise<void> {
  const tbody = getCachedElementById('daily-report-tbody');
  const thead = getCachedElementById('daily-report-thead');
  if (!tbody || !thead) return;
  const cache = window.dailyReportDataCache;
  if (!cache?.clients) {
    await loadDailyReport();
    return;
  }
  const { clients, dateRange } = cache;
  const holidays = new Set<string>();
  const filteredClients = await applyDailyFilters(clients);
  const statusData = calculateDailyStatus(filteredClients, dateRange);
  updateDailyStatusCards(statusData);
  const sortState = getDailySortState();
  const sortedClients = sortDailyClients(filteredClients, sortState.column);
  updateAllDailyHeaderIcons();
  tbody.innerHTML = '';
  renderDailyBody(tbody as HTMLElement, sortedClients, dateRange, holidays);
}
