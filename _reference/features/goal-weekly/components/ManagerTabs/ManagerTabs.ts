/**
 * Goal Weekly Feature — 매니저 탭
 */

import { getManagerList } from '@shared/api';
import { getCachedElementById } from '@shared/lib';
import type { WeeklyGoalState } from '../../lib/types';

export async function loadManagerTabs(
  loadAllManagersGoals: () => Promise<void>,
  loadManagerGoals: (managerId: number) => Promise<void>,
  state: WeeklyGoalState
): Promise<void> {
  const tabsContainer = getCachedElementById('manager-tabs');
  if (!tabsContainer) return;

  let managers = await getManagerList();
  if (!managers) return;
  managers = (managers as { id: number; manager_name?: string }[]).filter(
    (m) => m.id !== 98 && m.id !== 99
  );

  tabsContainer.innerHTML = '';

  if (managers.length > 0) {
    managers.forEach((manager) => {
      const firstName = manager.manager_name
        ? manager.manager_name.split(' ')[0]
        : `Manager ${manager.id}`;
      const tab = document.createElement('button');
      tab.className = 'manager-tab';
      tab.dataset.managerId = String(manager.id);
      tab.textContent = firstName;

      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) {
          tab.classList.remove('active');
          state.currentManagerTabId = null;
          loadAllManagersGoals();
        } else {
          document.querySelectorAll('.manager-tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          state.currentManagerTabId = manager.id;
          loadManagerGoals(manager.id);
        }
      });

      tabsContainer.appendChild(tab);
    });

    requestAnimationFrame(() => {
      const tabs = tabsContainer.querySelectorAll('.manager-tab') as NodeListOf<HTMLElement>;
      let maxWidth = 0;
      tabs.forEach((t) => {
        const w = t.getBoundingClientRect().width;
        if (w > maxWidth) maxWidth = w;
      });
      if (maxWidth > 0) {
        tabs.forEach((t) => {
          t.style.minWidth = `${Math.ceil(maxWidth)}px`;
        });
      }
    });

    loadAllManagersGoals();
  }
}
