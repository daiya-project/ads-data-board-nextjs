/**
 * 주간 리포트 — 필터 UI 이벤트
 */

import { getCachedElementById } from '@shared/lib';
import { filterWeeklyReportTable } from './filter-table';

export function setupWeeklyReportFilters(): void {
  const searchInput = document.getElementById('weekly-search-input') as HTMLInputElement | null;
  const searchClearBtn = getCachedElementById('weekly-search-clear');
  const managerFilter = document.getElementById('weekly-manager-filter');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  if (searchInput) {
    searchInput.addEventListener('input', function (this: HTMLInputElement) {
      if (searchClearBtn) {
        (searchClearBtn as HTMLElement).style.display = this.value.trim() ? 'block' : 'none';
      }
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => void filterWeeklyReportTable(), 300);
    });
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        (searchClearBtn as HTMLElement).style.display = 'none';
        void filterWeeklyReportTable();
      });
    }
  }
  if (managerFilter) {
    managerFilter.addEventListener('change', () => void filterWeeklyReportTable());
  }
}
