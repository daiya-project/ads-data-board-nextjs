/**
 * 일별 리포트 — 최초 로드 오케스트레이션
 */

import { runReportLoad } from '../shared/run-report-load';
import { fetchDailyReportData } from './data';
import { calculateDailyStatus } from './status';
import { updateDailyStatusCards } from './status';
import { applyDailyFilters } from './filters';
import { sortDailyClients, getDailySortState } from './sort';
import { renderDailyHeader, renderDailyBody } from './table';
import { filterDailyReportTable } from './filter-table';

export async function loadDailyReport(): Promise<void> {
  await runReportLoad({
    reportName: 'loadDailyReport',
    tbodyId: 'daily-report-tbody',
    theadId: 'daily-report-thead',
    managerFilterId: 'daily-manager-filter',
    fetchData: fetchDailyReportData,
    getRange: (result) => result.dateRange,
    calculateStatus: calculateDailyStatus,
    updateStatusCards: updateDailyStatusCards,
    applyFilters: applyDailyFilters,
    sortClients: sortDailyClients,
    getSortState: getDailySortState,
    renderHeader: (headerRow, result, onFilterTable) =>
      renderDailyHeader(headerRow, result.dateRange, result.holidays, onFilterTable),
    renderBody: (tbody, clients, result) =>
      renderDailyBody(tbody, clients, result.dateRange, result.holidays),
    filterTable: filterDailyReportTable,
    setWindowCache: (result) => {
      window.dailyReportDataCache = { clients: result.clients, dateRange: result.dateRange };
    },
    emptyMessage: '데이터가 없습니다',
    errorMessage: '데이터를 불러오는 중 오류가 발생했습니다.',
  });
}
