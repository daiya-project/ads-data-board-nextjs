/**
 * Manager Setting Table - 정렬 로직 및 헤더 UI
 */

import type { ManagerSettingClient, ManagerSortState, SortOrder } from './manager-setting-types';

let managerSortState: ManagerSortState = { column: null, order: null };

export function getSortState(): ManagerSortState {
  return { ...managerSortState };
}

export function sortManagerSettingClients(
  data: ManagerSettingClient[],
  column: string | null
): ManagerSettingClient[] {
  if (!managerSortState.order || !column) return [...data];
  const sorted = [...data];
  const order = managerSortState.order;

  sorted.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    switch (column) {
      case 'created_at':
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case 'client_id':
        aVal = a.client_id;
        bVal = b.client_id;
        break;
      case 'client_name':
        aVal = (a.client_name ?? '').toString();
        bVal = (b.client_name ?? '').toString();
        break;
      case 'manager_id':
        aVal = a.manager_id == null ? Infinity : a.manager_id;
        bVal = b.manager_id == null ? Infinity : b.manager_id;
        break;
      case 'second_manager_id':
        aVal = a.second_manager_id == null ? Infinity : a.second_manager_id;
        bVal = b.second_manager_id == null ? Infinity : b.second_manager_id;
        break;
      case 'outbound':
        aVal = a.outbound === true ? 1 : 0;
        bVal = b.outbound === true ? 1 : 0;
        break;
      default:
        aVal = (a as Record<string, unknown>)[column] as number | string;
        bVal = (b as Record<string, unknown>)[column] as number | string;
    }
    if (order === 'asc') {
      if (typeof aVal === 'string') return aVal.localeCompare(bVal as string);
      return (aVal as number) - (bVal as number);
    }
    if (typeof aVal === 'string') return (bVal as string).localeCompare(aVal);
    return (bVal as number) - (aVal as number);
  });
  return sorted;
}

export function cycleManagerSortState(column: string): void {
  if (managerSortState.column === column) {
    if (managerSortState.order === 'asc') {
      managerSortState.order = 'desc';
    } else if (managerSortState.order === 'desc') {
      managerSortState.order = null;
    } else {
      managerSortState.order = 'asc';
    }
  } else {
    managerSortState.column = column;
    managerSortState.order = 'asc';
  }
}

export function updateManagerHeaderSortIcon(th: HTMLElement, column: string): void {
  const existingIcon = th.querySelector('.sort-icon');
  if (existingIcon) existingIcon.remove();
  if (managerSortState.column === column && managerSortState.order) {
    const icon = document.createElement('span');
    icon.className = 'sort-icon';
    icon.style.marginLeft = '4px';
    icon.style.fontSize = '10px';
    icon.textContent = managerSortState.order === 'asc' ? '▲' : '▼';
    th.appendChild(icon);
  }
}

export function updateAllManagerHeaderSortIcons(thead: Element | null): void {
  if (!thead) return;
  const headers = thead.querySelectorAll<HTMLElement>('th[data-column]');
  headers.forEach((th) => {
    const col = th.dataset.column;
    if (col) updateManagerHeaderSortIcon(th, col);
  });
}

export function addManagerSortableHeader(
  th: HTMLTableCellElement,
  column: string,
  text: string,
  onSortOnly: (() => void) | undefined
): void {
  th.textContent = text;
  th.style.textAlign = 'center';
  th.style.cursor = 'pointer';
  th.style.userSelect = 'none';
  th.dataset.column = column;
  updateManagerHeaderSortIcon(th, column);
  th.addEventListener('click', () => {
    cycleManagerSortState(column);
    if (onSortOnly) onSortOnly();
  });
}
