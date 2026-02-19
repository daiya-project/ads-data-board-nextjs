/**
 * UI Helpers Module
 * 공통 UI 유틸리티 함수들
 */

import { getCachedElementById } from '../../lib/cache';
import { getManagerList } from '../../api/api';

/**
 * 토스트 메시지 표시
 */
export function showToast(message: string): void {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'Toast__container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'Toast__item';
  toast.innerHTML = `<i class="ri-checkbox-circle-fill"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
    }
  }, 4000);
}

/**
 * 매니저 목록 로드 (셀렉트 박스)
 */
export async function loadManagerList(selectId: string): Promise<void> {
  const select = getCachedElementById(selectId) as HTMLSelectElement | null;
  if (!select) return;

  const managerData = await getManagerList();
  if (!managerData) return;

  select.innerHTML = '<option value="">담당자</option>';
  for (const manager of managerData) {
    const option = document.createElement('option');
    option.value = String(manager.id);
    option.textContent = manager.manager_name ?? `Manager ${manager.id}`;
    select.appendChild(option);
  }
}

/**
 * Status 카드 클릭 이벤트 핸들러 설정
 */
export function setupStatusCardClickHandlers(
  loadDailyReport: () => void,
  loadWeeklyReport: () => void
): void {
  const dailyStatusCards = document.querySelectorAll('#daily-tab .StatusCards__card');
  dailyStatusCards.forEach((card) => {
    card.addEventListener('click', function (this: HTMLElement) {
      const status = this.getAttribute('data-status') ?? '';

      let statusFilter = getCachedElementById('daily-status-filter') as HTMLInputElement | null;
      if (!statusFilter) {
        statusFilter = document.createElement('input');
        statusFilter.type = 'hidden';
        statusFilter.id = 'daily-status-filter';
        const dailyTab = getCachedElementById('daily-tab');
        if (dailyTab) dailyTab.appendChild(statusFilter);
      }

      if (statusFilter.value === status) {
        statusFilter.value = '';
        dailyStatusCards.forEach((c) => c.classList.remove('active'));
      } else {
        statusFilter.value = status;
        dailyStatusCards.forEach((c) => c.classList.remove('active'));
        this.classList.add('active');
      }
      loadDailyReport();
    });
  });

  const weeklyStatusCards = document.querySelectorAll('#weekly-tab .StatusCards__card');
  weeklyStatusCards.forEach((card) => {
    card.addEventListener('click', function (this: HTMLElement) {
      const status = this.getAttribute('data-status') ?? '';

      let statusFilter = getCachedElementById('weekly-status-filter') as HTMLInputElement | null;
      if (!statusFilter) {
        statusFilter = document.createElement('input');
        statusFilter.type = 'hidden';
        statusFilter.id = 'weekly-status-filter';
        const weeklyTab = getCachedElementById('weekly-tab');
        if (weeklyTab) weeklyTab.appendChild(statusFilter);
      }

      if (statusFilter.value === status) {
        statusFilter.value = '';
        weeklyStatusCards.forEach((c) => c.classList.remove('active'));
      } else {
        statusFilter.value = status;
        weeklyStatusCards.forEach((c) => c.classList.remove('active'));
        this.classList.add('active');
      }
      loadWeeklyReport();
    });
  });
}
