/**
 * 일별 리포트 — 필터 UI 이벤트 (검색·담당자·clear)
 */

import { getCachedElementById } from '@shared/lib';
import { filterDailyReportTable } from './filter-table';

export function setupDailyReportFilters(): void {
  const searchInput = document.getElementById('daily-search-input') as HTMLInputElement | null;
  const searchClearBtn = getCachedElementById('daily-search-clear');
  const managerFilter = document.getElementById('daily-manager-filter');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  if (searchInput) {
    searchInput.addEventListener('input', function (this: HTMLInputElement) {
      if (searchClearBtn) {
        (searchClearBtn as HTMLElement).style.display = this.value.trim() ? 'block' : 'none';
      }
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => void filterDailyReportTable(), 300);
    });
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        (searchClearBtn as HTMLElement).style.display = 'none';
        void filterDailyReportTable();
      });
    }
  }
  if (managerFilter) {
    managerFilter.addEventListener('change', () => void filterDailyReportTable());
  }
}
