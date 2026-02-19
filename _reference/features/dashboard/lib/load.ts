/**
 * Dashboard 데이터 오케스트레이션 및 DOM 연동
 * loadDashboardCharts, initializeManagerCharts, loadManagerCharts
 */

import { getSupabaseClientSafe } from '@shared/api';
import type { SupabaseClient } from '@shared/types';
import { handleError, devLog } from '@shared/lib';
import { renderMonthlyChart, renderWeeklyChart, renderManagerMonthlyChart, renderManagerWeeklyChart } from './chart';
import { loadDashboardKPICards, loadManagerKPICards } from './kpi';
import {
  getDashboardSelectedMonth,
  setDashboardSelectedMonth,
  setLatestMonthFromDb,
  getLatestMonthFromDb,
} from './dashboard-state';
import { setupDashboardMonthSelector } from './month-selector';
import {
  getDefaultSelectedMonth,
  getDashboardMonthlyChartData,
  getDashboardWeeklyChartData,
  getManagerMonthlyChartData,
  getManagerWeeklyChartData,
  fetchManagersForAds,
} from './dashboard-data';

export { getDefaultSelectedMonth };

export async function loadDashboardCharts(): Promise<void> {
  if (typeof (window as unknown as { Chart?: unknown }).Chart === 'undefined') {
    console.error('Chart.js가 로드되지 않았습니다. CDN 링크를 확인해주세요.');
    return;
  }

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(new Error('Supabase 클라이언트가 초기화되지 않았습니다.'), 'loadDailyReport');
    return;
  }

  const monthlyCanvas = document.getElementById('monthly-chart');
  const weeklyCanvas = document.getElementById('weekly-chart');

  if (!monthlyCanvas || !weeklyCanvas) {
    console.error('차트 Canvas 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    let selectedMonth = getDashboardSelectedMonth();
    if (!selectedMonth) {
      const defaultMonth = await getDefaultSelectedMonth(supabase);
      setDashboardSelectedMonth(defaultMonth);
      setLatestMonthFromDb(defaultMonth);
      selectedMonth = defaultMonth;
    }
    const latestMonthFromDb = getLatestMonthFromDb();
    if (!latestMonthFromDb) setLatestMonthFromDb(selectedMonth);

    const monthlyData = await getDashboardMonthlyChartData(supabase, selectedMonth);
    const weeklyData = await getDashboardWeeklyChartData(supabase, selectedMonth, () =>
      Promise.resolve(getLatestMonthFromDb())
    );

    renderMonthlyChart(monthlyData);
    renderWeeklyChart(weeklyData);
    await loadDashboardKPICards(supabase, monthlyData, selectedMonth, latestMonthFromDb);
    await initializeManagerCharts(supabase);
    setupDashboardMonthSelector(() => {
      void loadDashboardCharts();
    });

    devLog('대시보드 차트 로드 완료');
  } catch (error) {
    console.error('대시보드 차트 로드 오류:', error);
  }
}

let managerDropdownInitialized = false;

export async function initializeManagerCharts(supabase: SupabaseClient): Promise<void> {
  try {
    const managerData = await fetchManagersForAds(supabase);

    const dropdown = document.getElementById('manager-chart-dropdown');
    const trigger = document.getElementById('manager-chart-trigger');
    const menu = document.getElementById('manager-chart-menu');
    const valueEl = document.getElementById('manager-chart-value');

    if (!dropdown || !trigger || !menu || !valueEl) {
      return;
    }

    const existingItems = menu.querySelectorAll('.Dropdown__item:not([data-value=""]), .glass-dropdown-item:not([data-value=""])');
    existingItems.forEach((item) => item.remove());

    if (managerData && managerData.length > 0) {
      for (const manager of managerData) {
        const item = document.createElement('div');
        item.className = 'Dropdown__item';
        item.dataset.value = String(manager.id);
        item.textContent = manager.manager_name || `Manager ${manager.id}`;
        menu.appendChild(item);
      }
    }

    const newTrigger = trigger.cloneNode(true) as HTMLElement;
    trigger.parentNode?.replaceChild(newTrigger, trigger);

    const liveValueEl = newTrigger.querySelector('.Dropdown__value, .glass-dropdown-value') as HTMLElement | null;

    newTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    if (liveValueEl) {
      liveValueEl.textContent = 'All';
    }

    const newMenu = menu.cloneNode(true) as HTMLElement;
    menu.parentNode?.replaceChild(newMenu, menu);

    newMenu.querySelectorAll('.Dropdown__item, .glass-dropdown-item').forEach((item) => {
      const el = item as HTMLElement;
      if (el.dataset.value === '') {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    newMenu.addEventListener('click', async (e) => {
      const target = (e.target as HTMLElement).closest('.Dropdown__item, .glass-dropdown-item') as HTMLElement;
      if (!target) return;

      newMenu.querySelectorAll('.Dropdown__item, .glass-dropdown-item').forEach((item) => item.classList.remove('active'));
      target.classList.add('active');

      if (liveValueEl) {
        liveValueEl.textContent = target.textContent ?? 'All';
      }
      dropdown.classList.remove('open');

      const selectedValue = target.dataset.value ?? '';
      const managerIdInt = selectedValue ? parseInt(selectedValue, 10) : null;
      const selectedMonth = getDashboardSelectedMonth();
      await loadManagerCharts(supabase, managerIdInt, selectedMonth);
      await loadManagerKPICards(supabase, managerIdInt, selectedMonth);
    });

    if (!managerDropdownInitialized) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!dropdown.contains(target)) {
          dropdown.classList.remove('open');
        }
      });
      managerDropdownInitialized = true;
    }

    const selectedMonth = getDashboardSelectedMonth();
    await loadManagerCharts(supabase, null, selectedMonth);
    await loadManagerKPICards(supabase, null, selectedMonth);
  } catch (error) {
    console.error('매니저별 그래프 초기화 오류:', error);
  }
}

export async function loadManagerCharts(
  supabase: SupabaseClient,
  managerId: number | null,
  selectedMonth: string
): Promise<void> {
  try {
    const monthlyData = await getManagerMonthlyChartData(supabase, managerId, selectedMonth);
    const weeklyData = await getManagerWeeklyChartData(
      supabase,
      managerId,
      selectedMonth,
      () => Promise.resolve(getLatestMonthFromDb())
    );
    if (monthlyData) renderManagerMonthlyChart(monthlyData);
    renderManagerWeeklyChart(weeklyData);
  } catch (error) {
    console.error('매니저별 그래프 로드 오류:', error);
  }
}
