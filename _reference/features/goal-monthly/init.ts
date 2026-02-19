/**
 * Goal Monthly Feature — 초기화 로직
 * 헤더(매니저 탭 + 월 선택) + 차트 + 캘린더 초기화 및 갱신
 */

import { setupMonthSelector, updateMonthDisplay, monthOffset } from './components/MonthSelector';
import { setupManagerTabs } from './components/ManagerTabs';
import { state } from './lib/state';
import { loadGoalMonthlyCharts } from './lib/charts';
import { fetchCalendarData, renderCalendar } from './components/Calendar';
import { renderOutboundSection, cleanupOutboundSection } from './components/OutboundSection';
import { renderMaChartRevenueSection, cleanupMaChartRevenueSection } from './components/MaChart';

const CONTENT_ID = 'goal-monthly-content';
let initDone = false;

function ensureContentStructure(): void {
  const container = document.getElementById(CONTENT_ID);
  if (!container) return;

  if (container.querySelector('.GoalMonthly__chartSection')) return;

  container.innerHTML = `
    <div class="GoalMonthly__chartSection">
      <div class="RevenueChart__container">
        <div class="RevenueChart__wrapper RevenueChart__wrapper--monthly">
          <canvas id="goal-monthly-cumulative-chart"></canvas>
        </div>
        <div class="RevenueChart__wrapper RevenueChart__wrapper--weekly">
          <canvas id="goal-monthly-weekly-chart"></canvas>
        </div>
      </div>
    </div>
    <div id="goal-monthly-revenue-trend-area"></div>
    <div id="goal-monthly-calendar-area"></div>
    <div id="goal-monthly-outbound-section"></div>
  `;
}

async function onFilterChange(): Promise<void> {
  ensureContentStructure();

  const { selectedMonth, selectedManagerId } = state;

  cleanupMaChartRevenueSection();

  const [, calendarData] = await Promise.all([
    loadGoalMonthlyCharts(selectedMonth, selectedManagerId),
    fetchCalendarData(selectedMonth, selectedManagerId),
    renderMaChartRevenueSection('goal-monthly-revenue-trend-area', selectedMonth, selectedManagerId),
  ]);

  const calendarArea = document.getElementById('goal-monthly-calendar-area');
  if (calendarArea) {
    calendarArea.innerHTML = '';
    if (calendarData) {
      renderCalendar('goal-monthly-calendar-area', calendarData, selectedMonth, (delta) => {
        state.selectedMonth = monthOffset(state.selectedMonth, delta);
        updateMonthDisplay();
        onFilterChange();
      });
    } else {
      calendarArea.innerHTML = '<p class="empty-state">데이터를 불러올 수 없습니다.</p>';
    }
  }

  const outboundSection = document.getElementById('goal-monthly-outbound-section');
  if (outboundSection) {
    if (selectedManagerId === 3) {
      await renderOutboundSection('goal-monthly-outbound-section');
    } else {
      cleanupOutboundSection();
      outboundSection.innerHTML = '';
    }
  }
}

export async function initGoalMonthly(): Promise<void> {
  if (initDone) {
    await onFilterChange();
    return;
  }
  initDone = true;

  updateMonthDisplay();
  setupMonthSelector(onFilterChange);
  await setupManagerTabs(onFilterChange);

  await onFilterChange();
}

/**
 * 페이지 이탈 시 정리 (라우터 코드 스플리팅용)
 */
export function destroyGoalMonthly(): void {
  initDone = false;
  cleanupMaChartRevenueSection();
  cleanupOutboundSection();
  const calendarArea = document.getElementById('goal-monthly-calendar-area');
  if (calendarArea) calendarArea.innerHTML = '';
  const outboundSection = document.getElementById('goal-monthly-outbound-section');
  if (outboundSection) outboundSection.innerHTML = '';
}
