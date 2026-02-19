/**
 * Dashboard 월 선택 UI (‹ 2026. 01 › + 모달)
 * onRefresh: 월 변경 시 호출할 콜백 (loadDashboardCharts)
 */

import {
  getDashboardSelectedMonth,
  setDashboardSelectedMonth,
} from './dashboard-state';

function formatMonthDisplay(ym: string): string {
  if (!ym || ym.length < 7) return '–';
  const [y, m] = ym.split('-');
  return `${y}. ${m.padStart(2, '0')}`;
}

function monthOffset(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = d.getMonth() + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function updateDisplay(direction?: 'up' | 'down'): void {
  const el = document.getElementById('dashboard-month-display');
  if (!el) return;
  if (direction) {
    el.classList.remove('slide-up', 'slide-down');
    void el.offsetWidth;
    el.classList.add(direction === 'up' ? 'slide-up' : 'slide-down');
  }
  el.textContent = formatMonthDisplay(getDashboardSelectedMonth());
}

let setupDone = false;

/** 대시보드 destroy 시 호출. 재진입 시 이벤트를 다시 붙이기 위해 플래그 초기화 */
export function resetDashboardMonthSelectorSetup(): void {
  setupDone = false;
}

export function setupDashboardMonthSelector(onRefresh: () => void): void {
  updateDisplay();
  if (setupDone) return;
  setupDone = true;

  const prevBtn = document.getElementById('dashboard-month-prev');
  const nextBtn = document.getElementById('dashboard-month-next');
  const displayEl = document.getElementById('dashboard-month-display');
  const overlay = document.getElementById('dashboard-month-picker-modal');
  const yearSelect = document.getElementById('dashboard-month-picker-year') as HTMLSelectElement;
  const body = document.getElementById('dashboard-month-picker-body');

  function openModal(): void {
    if (!overlay || !yearSelect || !body) return;
    const current = getDashboardSelectedMonth();
    const [currentY] = current.split('-').map(Number);
    const years = [currentY - 2, currentY - 1, currentY, currentY + 1, currentY + 2];
    yearSelect.innerHTML = years
      .map((y) => `<option value="${y}" ${y === currentY ? 'selected' : ''}>${y}년</option>`)
      .join('');
    body.innerHTML = '';
    for (let month = 1; month <= 12; month++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${month}월`;
      btn.dataset.month = String(month);
      btn.addEventListener('click', () => {
        const y = parseInt(yearSelect.value, 10);
        const ym = `${y}-${String(month).padStart(2, '0')}`;
        setDashboardSelectedMonth(ym);
        updateDisplay('up');
        overlay!.style.display = 'none';
        onRefresh();
      });
      body.appendChild(btn);
    }
    overlay.style.display = 'flex';
  }

  function closeModal(): void {
    if (overlay) overlay.style.display = 'none';
  }

  prevBtn?.addEventListener('click', () => {
    const ym = monthOffset(getDashboardSelectedMonth(), -1);
    setDashboardSelectedMonth(ym);
    updateDisplay('down');
    onRefresh();
  });
  nextBtn?.addEventListener('click', () => {
    const ym = monthOffset(getDashboardSelectedMonth(), 1);
    setDashboardSelectedMonth(ym);
    updateDisplay('up');
    onRefresh();
  });
  displayEl?.addEventListener('click', openModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}
