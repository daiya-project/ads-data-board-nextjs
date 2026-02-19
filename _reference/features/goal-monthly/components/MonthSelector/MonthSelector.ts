/**
 * Goal Monthly — 월 선택기 (‹ 2025년 2월 ›)
 */

import { state } from '../../lib/state';

function formatMonthDisplay(ym: string): string {
  if (!ym || ym.length < 7) return '–';
  const [y, m] = ym.split('-');
  return `${y}년 ${parseInt(m, 10)}월`;
}

export function monthOffset(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = d.getMonth() + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

export function updateMonthDisplay(direction?: 'up' | 'down'): void {
  const el = document.getElementById('goal-month-display');
  if (!el) return;
  if (direction) {
    el.classList.remove('slide-up', 'slide-down');
    void el.offsetWidth;
    el.classList.add(direction === 'up' ? 'slide-up' : 'slide-down');
  }
  el.textContent = formatMonthDisplay(state.selectedMonth);
}

export function setupMonthSelector(onChange: () => void): void {
  updateMonthDisplay();

  const prevBtn = document.getElementById('goal-month-prev');
  const nextBtn = document.getElementById('goal-month-next');

  prevBtn?.addEventListener('click', () => {
    state.selectedMonth = monthOffset(state.selectedMonth, -1);
    updateMonthDisplay('down');
    onChange();
  });
  nextBtn?.addEventListener('click', () => {
    state.selectedMonth = monthOffset(state.selectedMonth, 1);
    updateMonthDisplay('up');
    onChange();
  });
}
