/**
 * Goal Setting - Manager Module
 * 매니저 설정 관리 (메인 조합 및 공개 API)
 */

import { getCachedElementById } from '@shared/lib';
import { handleError } from '@shared/lib';
import {
  setupManagerSelectChangeHandlers,
  setupSecondManagerSelectChangeHandlers,
} from '../GoalSettingTable/CellChangeHandler';
import {
  loadOutboundPeriods,
  setupOutboundButtonHandlers,
} from './OutboundModal';
import type { ManagerSettingClient } from './manager-setting-types';
import type { LoadBulkManagerSelectFn, SetupManagerSettingEventsFn } from './manager-setting-types';
import {
  getSortState,
  sortManagerSettingClients,
  updateAllManagerHeaderSortIcons,
  addManagerSortableHeader,
} from './manager-setting-sort';
import { closeAllCellDropdowns } from './manager-setting-dropdown';
import { renderManagerSettingRows } from './manager-setting-rows';
import { fetchManagerSettingData, updateClientManager as updateClientManagerApi } from './manager-setting-api';

/* ---------- 모듈 상태 ---------- */

let lastManagerSettingData: ManagerSettingClient[] | null = null;
let lastManagerMap: Map<number, string> | null = null;
let cellDropdownGlobalListenerAttached = false;

/* ---------- 공개 API ---------- */

export async function loadManagerSetting(
  loadBulkManagerSelect: LoadBulkManagerSelectFn,
  setupManagerSettingEvents: SetupManagerSettingEventsFn
): Promise<void> {
  const tbody = getCachedElementById('manager-setting-tbody') as HTMLElement | null;
  const thead = getCachedElementById('manager-setting-thead') as HTMLElement | null;

  if (!tbody || !thead) {
    console.error('Manager Setting 테이블 요소를 찾을 수 없습니다.');
    return;
  }

  const showUnassignedBtn = getCachedElementById('show-unassigned-btn');
  const showUnassignedOnly = !!showUnassignedBtn?.classList.contains('active');

  let data: Awaited<ReturnType<typeof fetchManagerSettingData>>;
  try {
    data = await fetchManagerSettingData(showUnassignedOnly);
  } catch (err) {
    lastManagerSettingData = null;
    lastManagerMap = null;
    console.error('Manager Setting 로드 오류:', err);
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">데이터를 불러오는 중 오류가 발생했습니다: ' +
      (err as Error).message +
      '</td></tr>';
    return;
  }

  if (!data) {
    lastManagerSettingData = null;
    lastManagerMap = null;
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">데이터가 없습니다</td></tr>';
    return;
  }

  const { clients, managerMap } = data;

  const outboundMap = await loadOutboundPeriods();

  for (const client of clients) {
    client.outbound = outboundMap.has(Number(client.client_id));
  }

  lastManagerSettingData = clients;
  lastManagerMap = managerMap;

  const reloadManagerSetting = () =>
    loadManagerSetting(loadBulkManagerSelect, setupManagerSettingEvents);

  function reSortAndRenderOnly(): void {
    updateAllManagerHeaderSortIcons(thead);
    const sortedData = sortManagerSettingClients(
      lastManagerSettingData!,
      getSortState().column
    );
    renderManagerSettingRows(tbody, sortedData, lastManagerMap!, outboundMap);
    loadBulkManagerSelect().then(() => {
      setupManagerSelectChangeHandlers(reloadManagerSetting);
      setupSecondManagerSelectChangeHandlers(reloadManagerSetting);
      setupOutboundButtonHandlers(outboundMap, reloadManagerSetting);
    });
  }

  const onHeaderSortClick = (): void => {
    if (lastManagerSettingData && lastManagerMap) {
      reSortAndRenderOnly();
    } else {
      loadManagerSetting(loadBulkManagerSelect, setupManagerSettingEvents);
    }
  };

  const headerRow = thead.querySelector('tr');
  if (headerRow) {
    headerRow.innerHTML = '';
    const thCheckbox = document.createElement('th');
    thCheckbox.style.textAlign = 'center';
    thCheckbox.style.width = '50px';
    headerRow.appendChild(thCheckbox);
    const columns: [string, string][] = [
      ['created_at', 'DATE'],
      ['client_id', 'Client ID'],
      ['client_name', 'Client'],
      ['manager_id', '담당자'],
      ['second_manager_id', '영업 담당자'],
      ['outbound', 'OUT-BOUND'],
    ];
    for (const [col, text] of columns) {
      const th = document.createElement('th');
      addManagerSortableHeader(th, col, text, onHeaderSortClick);
      headerRow.appendChild(th);
    }
  }

  const sortedData = sortManagerSettingClients(clients, getSortState().column);
  renderManagerSettingRows(tbody, sortedData, managerMap, outboundMap);

  await loadBulkManagerSelect();
  setupManagerSettingEvents();
  setupManagerSelectChangeHandlers(reloadManagerSetting);
  setupSecondManagerSelectChangeHandlers(reloadManagerSetting);
  setupOutboundButtonHandlers(outboundMap, reloadManagerSetting);

  if (!cellDropdownGlobalListenerAttached) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('.cell-glass-dropdown') ||
        target.closest('.cell-glass-dropdown__menu--portal') ||
        target.closest('.bulk-glass-dropdown__menu--portal')
      ) {
        return;
      }
      closeAllCellDropdowns();
    });
    cellDropdownGlobalListenerAttached = true;
  }
}

export async function updateClientManager(
  clientId: number,
  managerId: number | null
): Promise<void> {
  try {
    await updateClientManagerApi(clientId, managerId);
  } catch (err) {
    lastManagerSettingData = null;
    lastManagerMap = null;
    console.error('updateClientManager 오류:', err);
    throw err;
  }
}
