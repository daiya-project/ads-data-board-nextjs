/**
 * 일별 리포트 — 정렬
 */

import { getCachedElementById } from '@shared/lib';
import type { DailyReportRow } from '../types';
import type { SortState } from '../types';

const dailySortState: SortState = {
  column: 'changeAmount',
  order: 'asc',
};

export function getDailySortState(): SortState {
  return { ...dailySortState };
}

export function sortDailyClients(clients: DailyReportRow[], column: string): DailyReportRow[] {
  if (!dailySortState.order) {
    return [...clients].sort((a, b) => (b.mostRecentAmount ?? 0) - (a.mostRecentAmount ?? 0));
  }
  const sorted = [...clients];
  const order = dailySortState.order;
  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (column) {
      case 'client_id': aVal = a.client_id; bVal = b.client_id; break;
      case 'client_name': aVal = a.client_name; bVal = b.client_name; break;
      case 'avgValue': aVal = a.avgValue === Infinity ? Number.MAX_VALUE : (a.avgValue ?? 0); bVal = b.avgValue === Infinity ? Number.MAX_VALUE : (b.avgValue ?? 0); break;
      case 'dayBeforeValue': aVal = a.dayBeforeValue === Infinity ? Number.MAX_VALUE : (a.dayBeforeValue ?? 0); bVal = b.dayBeforeValue === Infinity ? Number.MAX_VALUE : (b.dayBeforeValue ?? 0); break;
      case 'changeAmount': aVal = a.changeAmount ?? 0; bVal = b.changeAmount ?? 0; break;
      case 'mostRecentAmount': aVal = a.mostRecentAmount ?? 0; bVal = b.mostRecentAmount ?? 0; break;
      default: aVal = a.amounts.get(column) ?? 0; bVal = b.amounts.get(column) ?? 0;
    }
    if (order === 'asc') {
      if (typeof aVal === 'string') return aVal.localeCompare(String(bVal));
      return (aVal as number) - (bVal as number);
    } else {
      if (typeof aVal === 'string') return String(bVal).localeCompare(aVal);
      return (bVal as number) - (aVal as number);
    }
  });
  return sorted;
}

function cycleDailySortState(column: string): void {
  if (dailySortState.column === column) {
    if (dailySortState.order === 'asc') dailySortState.order = 'desc';
    else if (dailySortState.order === 'desc') dailySortState.order = null;
    else dailySortState.order = 'asc';
  } else {
    dailySortState.column = column;
    dailySortState.order = 'asc';
  }
}

export function updateDailyHeaderSortIcon(th: HTMLElement, column: string): void {
  const existing = th.querySelector('.sort-icon');
  if (existing) existing.remove();
  if (dailySortState.column === column && dailySortState.order) {
    const icon = document.createElement('span');
    icon.className = 'sort-icon';
    icon.style.marginLeft = '4px';
    icon.style.fontSize = '10px';
    icon.textContent = dailySortState.order === 'asc' ? '▲' : '▼';
    th.appendChild(icon);
  }
}

export function updateAllDailyHeaderIcons(): void {
  const thead = getCachedElementById('daily-report-thead');
  if (!thead) return;
  thead.querySelectorAll<HTMLElement>('th[data-column]').forEach((th) => {
    const col = th.dataset.column;
    if (col) updateDailyHeaderSortIcon(th, col);
  });
}

export function addDailySortableHeader(
  th: HTMLElement,
  column: string,
  text: string,
  onFilterTable: () => void
): void {
  th.textContent = text;
  th.style.textAlign = 'center';
  th.style.cursor = 'pointer';
  th.style.userSelect = 'none';
  th.dataset.column = column;
  updateDailyHeaderSortIcon(th, column);
  th.addEventListener('click', () => {
    cycleDailySortState(column);
    onFilterTable();
  });
}
