/**
 * 주간 리포트 — 최초 로드
 */

import { runReportLoad } from '../shared/run-report-load';
import { fetchWeeklyReportData } from './data';
import { calculateWeeklyStatus } from './status';
import { updateWeeklyStatusCards } from './status';
import { applyWeeklyFilters } from './filters';
import { sortWeeklyClients, getWeeklySortState } from './sort';
import { renderWeeklyHeader, renderWeeklyBody } from './table';
import { filterWeeklyReportTable } from './filter-table';

export async function loadWeeklyReport(): Promise<void> {
  await runReportLoad({
    reportName: 'loadWeeklyReport',
    tbodyId: 'weekly-report-tbody',
    theadId: 'weekly-report-thead',
    managerFilterId: 'weekly-manager-filter',
    activeTabId: 'weekly-tab',
    fetchData: fetchWeeklyReportData,
    getRange: (result) => result.weeks,
    calculateStatus: calculateWeeklyStatus,
    updateStatusCards: updateWeeklyStatusCards,
    applyFilters: applyWeeklyFilters,
    sortClients: sortWeeklyClients,
    getSortState: getWeeklySortState,
    renderHeader: (headerRow, result, onFilterTable) =>
      renderWeeklyHeader(headerRow, result.weeks, onFilterTable),
    renderBody: (tbody, clients, result) =>
      renderWeeklyBody(tbody, clients, result.weeks),
    filterTable: filterWeeklyReportTable,
    setWindowCache: (result) => {
      window.weeklyReportDataCache = { clients: result.clients, weeks: result.weeks };
    },
    emptyMessage: '주간 데이터가 없습니다',
    errorMessage: '데이터를 불러오는 중 오류가 발생했습니다.',
    emptyColspan: 6,
  });
}
