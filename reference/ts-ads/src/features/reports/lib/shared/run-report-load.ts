/**
 * 리포트 공통 로드 오케스트레이션
 * daily / weekly 동일 파이프라인: fetch → status → filters → sort → render
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, handleError } from '@shared/lib';
import { showSkeletonLoading } from '../common';
import { loadManagerListIntoSelect } from './manager-filter';
import type { SortState } from '../types';

export interface ReportLoadConfig<TClient, TResult extends { clients: TClient[] }, TStatus> {
  reportName: string;
  tbodyId: string;
  theadId: string;
  managerFilterId: string;
  fetchData: () => Promise<TResult | null>;
  getRange: (result: TResult) => string[];
  calculateStatus: (clients: TClient[], range: string[]) => TStatus;
  updateStatusCards: (status: TStatus) => void;
  applyFilters: (clients: TClient[]) => Promise<TClient[]>;
  sortClients: (clients: TClient[], column: string) => TClient[];
  getSortState: () => SortState;
  renderHeader: (headerRow: HTMLElement, result: TResult, onFilterTable: () => void) => void;
  renderBody: (tbody: HTMLElement, clients: TClient[], result: TResult) => void;
  filterTable: () => void;
  setWindowCache: (result: TResult) => void;
  emptyMessage: string;
  errorMessage: string;
  emptyColspan?: number;
  /** weekly만 사용: 활성 탭 체크용 요소 ID. 있으면 해당 탭이 active일 때만 로드 */
  activeTabId?: string;
}

/**
 * 일별/주간 공통 로드 파이프라인 실행
 */
export async function runReportLoad<TClient, TResult extends { clients: TClient[] }, TStatus>(
  config: ReportLoadConfig<TClient, TResult, TStatus>
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(
      new Error('Supabase 클라이언트가 초기화되지 않았습니다.'),
      config.reportName,
      config.errorMessage
    );
    return;
  }

  const tbody = getCachedElementById(config.tbodyId);
  const thead = getCachedElementById(config.theadId);
  if (!tbody || !thead) {
    console.error(`${config.reportName} 테이블 요소를 찾을 수 없습니다.`);
    return;
  }

  if (config.activeTabId) {
    const tab = getCachedElementById(config.activeTabId);
    if (!tab?.classList.contains('active')) return;
  }

  try {
    const result = await config.fetchData();
    if (!result) {
      const colspan = config.emptyColspan ?? 2;
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${config.emptyMessage}</td></tr>`;
      return;
    }

    const { clients: clientsWithComparisons } = result;
    const range = config.getRange(result);
    const headerRow = thead.querySelector('tr');
    if (!headerRow) return;

    config.renderHeader(headerRow as HTMLElement, result, () => void config.filterTable());
    showSkeletonLoading(tbody as HTMLElement, 10, config.theadId);

    if (clientsWithComparisons.length === 0) {
      const colspan = config.emptyColspan ?? range.length + 5;
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${config.emptyMessage}</td></tr>`;
      return;
    }

    const statusData = config.calculateStatus(clientsWithComparisons, range);
    config.updateStatusCards(statusData);
    config.setWindowCache(result);

    const filteredClients = await config.applyFilters(clientsWithComparisons);
    const sortedClients = config.sortClients(filteredClients, config.getSortState().column);

    tbody.innerHTML = '';
    config.renderBody(tbody as HTMLElement, sortedClients, result);

    await loadManagerListIntoSelect(config.managerFilterId);
  } catch (error) {
    handleError(error as Error, config.reportName, config.errorMessage);
    const colspan = config.emptyColspan ?? 6;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${config.errorMessage}: ${(error as Error).message}</td></tr>`;
  }
}
