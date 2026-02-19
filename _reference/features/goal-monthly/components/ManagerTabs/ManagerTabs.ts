/**
 * Goal Monthly — 매니저 탭 ([매니저A] [매니저B] …)
 * 활성 매니저를 다시 클릭하면 선택 해제 → 전체 데이터 표시
 */

import { getManagerList } from '@shared/api';
import { getCachedElementById } from '@shared/lib';
import { state } from '../../lib/state';

export async function setupManagerTabs(onChange: () => void): Promise<void> {
  const container = getCachedElementById('goal-monthly-manager-tabs');
  if (!container) return;

  const managers = await getManagerList();
  const list = (managers ?? []).filter(
    (m: { id: number }) => m.id !== 98 && m.id !== 99
  ) as { id: number; manager_name?: string }[];

  const wrapper = document.createElement('div');
  wrapper.className = 'manager-tabs';

  list.forEach((manager) => {
    const firstName = manager.manager_name?.split(' ')[0] ?? `Manager ${manager.id}`;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'manager-tab';
    tab.dataset.managerId = String(manager.id);
    tab.textContent = firstName;
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) {
        tab.classList.remove('active');
        state.selectedManagerId = null;
        onChange();
      } else {
        document.querySelectorAll('#goal-monthly-manager-tabs .manager-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedManagerId = manager.id;
        onChange();
      }
    });
    wrapper.appendChild(tab);
  });

  container.innerHTML = '';
  container.appendChild(wrapper);

  requestAnimationFrame(() => {
    const tabs = wrapper.querySelectorAll('.manager-tab') as NodeListOf<HTMLElement>;
    let maxWidth = 0;
    tabs.forEach((tab) => {
      const w = tab.getBoundingClientRect().width;
      if (w > maxWidth) maxWidth = w;
    });
    if (maxWidth > 0) {
      tabs.forEach((tab) => {
        tab.style.minWidth = `${Math.ceil(maxWidth)}px`;
      });
    }
  });
}

export function setActiveManagerTab(managerId: number | null): void {
  const container = document.getElementById('goal-monthly-manager-tabs');
  if (!container) return;
  container.querySelectorAll('.manager-tab').forEach((tab) => {
    const id = (tab as HTMLElement).dataset.managerId;
    const match = managerId !== null && String(managerId) === id;
    tab.classList.toggle('active', match);
  });
}
