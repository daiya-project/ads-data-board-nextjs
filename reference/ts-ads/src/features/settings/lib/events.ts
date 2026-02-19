/**
 * Goal Setting - Events Module
 * 이벤트 핸들러 설정
 */

import { getCachedElementById } from '@shared/lib';
import type { LoadManagerSettingFn } from '../components/ManagerSettingTable/manager-setting-types';

/**
 * Goal Setting 페이지 이벤트 리스너 설정
 */
export async function setupGoalSettingEvents(
  enableCellEdit: (cell: HTMLElement) => void
): Promise<void> {
  const tbody = getCachedElementById('goal-setting-tbody');
  if (!tbody || tbody.hasAttribute('data-delegated')) return;

  tbody.setAttribute('data-delegated', 'true');
  tbody.addEventListener('dblclick', function (e: Event) {
    const target = e.target as HTMLElement;
    const cell = target.closest('td.editable-cell') as HTMLElement | null;
    if (
      cell &&
      !cell.classList.contains('readonly-cell') &&
      !cell.classList.contains('editing')
    ) {
      e.stopPropagation();
      enableCellEdit(cell);
    }
  });
}

type SaveSelectedManagersFn = (loadManagerSetting: LoadManagerSettingFn) => void | Promise<void>;

/**
 * Manager Setting 이벤트 리스너 설정
 */
export function setupManagerSettingEvents(
  loadManagerSetting?: LoadManagerSettingFn,
  saveSelectedManagers?: SaveSelectedManagersFn
): void {
  const showUnassignedBtn = document.getElementById('show-unassigned-btn');
  if (showUnassignedBtn && !showUnassignedBtn.hasAttribute('data-listener-attached')) {
    showUnassignedBtn.setAttribute('data-listener-attached', 'true');
    showUnassignedBtn.addEventListener('click', function (this: HTMLElement) {
      this.classList.toggle('active');
      loadManagerSetting?.();
    });
  }

  const saveBtn = getCachedElementById('save-managers-btn');
  if (saveBtn && !saveBtn.hasAttribute('data-listener-attached') && loadManagerSetting && saveSelectedManagers) {
    saveBtn.setAttribute('data-listener-attached', 'true');
    saveBtn.addEventListener('click', async () => {
      await saveSelectedManagers(loadManagerSetting);
    });
  }
}
