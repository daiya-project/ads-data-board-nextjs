/**
 * 주간 리포트 — 정렬
 */

import { getCachedElementById } from '@shared/lib';
import type { WeeklyReportRow } from '../types';
import type { SortState } from '../types';

const weeklySortState: SortState = {
  column: 'changeAmount',
  order: 'asc',
};

export function getWeeklySortState(): SortState {
  return { ...weeklySortState };
}

export function sortWeeklyClients(clients: WeeklyReportRow[], column: string): WeeklyReportRow[] {
  if (!weeklySortState.order) {
    return [...clients].sort((a, b) => (b.mostRecentWeekAmount ?? 0) - (a.mostRecentWeekAmount ?? 0));
  }
  const sorted = [...clients];
  const order = weeklySortState.order;
  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (column) {
      case 'client_id': aVal = a.client_id; bVal = b.client_id; break;
      case 'client_name': aVal = a.client_name; bVal = b.client_name; break;
      case 'avgValue': aVal = a.avgValue === Infinity ? Number.MAX_VALUE : (a.avgValue ?? 0); bVal = b.avgValue === Infinity ? Number.MAX_VALUE : (b.avgValue ?? 0); break;
      case 'weekCompareValue': aVal = a.weekCompareValue === Infinity ? Number.MAX_VALUE : (a.weekCompareValue ?? 0); bVal = b.weekCompareValue === Infinity ? Number.MAX_VALUE : (b.weekCompareValue ?? 0); break;
      case 'changeAmount': aVal = a.changeAmount ?? 0; bVal = b.changeAmount ?? 0; break;
      case 'mostRecentWeekAmount': aVal = a.mostRecentWeekAmount ?? 0; bVal = b.mostRecentWeekAmount ?? 0; break;
      default: {
        const weekIndex = parseInt(column, 10);
        if (!isNaN(weekIndex)) {
          aVal = a.weeklyAmounts.get(weekIndex) ?? 0;
          bVal = b.weeklyAmounts.get(weekIndex) ?? 0;
        } else return 0;
      }
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

function cycleWeeklySortState(column: string): void {
  if (weeklySortState.column === column) {
    if (weeklySortState.order === 'asc') weeklySortState.order = 'desc';
    else if (weeklySortState.order === 'desc') weeklySortState.order = null;
    else weeklySortState.order = 'asc';
  } else {
    weeklySortState.column = column;
    weeklySortState.order = 'asc';
  }
}

export function updateWeeklyHeaderSortIcon(th: HTMLElement, column: string): void {
  const existing = th.querySelector('.sort-icon');
  if (existing) existing.remove();
  if (weeklySortState.column === column && weeklySortState.order) {
    const icon = document.createElement('span');
    icon.className = 'sort-icon';
    icon.style.marginLeft = '4px';
    icon.style.fontSize = '10px';
    icon.textContent = weeklySortState.order === 'asc' ? '▲' : '▼';
    th.appendChild(icon);
  }
}

export function updateAllWeeklyHeaderIcons(): void {
  const thead = getCachedElementById('weekly-report-thead');
  if (!thead) return;
  thead.querySelectorAll<HTMLElement>('th[data-column]').forEach((th) => {
    const col = th.dataset.column;
    if (col) updateWeeklyHeaderSortIcon(th, col);
  });
}

export function addWeeklySortableHeader(
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
  updateWeeklyHeaderSortIcon(th, column);
  th.addEventListener('click', () => {
    cycleWeeklySortState(column);
    onFilterTable();
  });
}
