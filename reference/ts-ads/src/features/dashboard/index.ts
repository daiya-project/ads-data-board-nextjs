/**
 * Dashboard Feature — JS-First 렌더링
 * 컨테이너에 대시보드 DOM을 그린 뒤 기존 loadDashboardCharts 로직으로 데이터 로드
 */

import './dashboard-page.css';
import './components/RevenueChart/RevenueChart.css';
import { MonthSelector } from './components/MonthSelector';
import { MonthPickerModal } from './components/MonthSelector/MonthPickerModal';
import { KpiCard } from './components/KpiCard';
import { RevenueChart } from './components/RevenueChart';
import { ManagerPerformance } from './components/ManagerPerformance';
import { loadDashboardCharts } from './lib/load';
import { resetDashboardMonthSelectorSetup } from './lib/month-selector';

const VARIANTS: Array<'daily' | 'weekly' | 'monthly' | 'expected'> = [
  'daily',
  'weekly',
  'monthly',
  'expected',
];

let monthSelector: MonthSelector | null = null;
let monthPickerModal: MonthPickerModal | null = null;
let kpiCards: KpiCard[] = [];
let revenueChart: RevenueChart | null = null;
let managerPerformance: ManagerPerformance | null = null;

/**
 * 대시보드 DOM을 컨테이너에 렌더링 (JS-First)
 */
export function init(container: HTMLElement): void {
  if (container.children.length > 0) return;

  monthSelector = new MonthSelector();
  monthSelector.render(container);

  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'KpiCard__grid';
  kpiCards = VARIANTS.map(
    (v) => new KpiCard({ idPrefix: 'dashboard', variant: v })
  );
  kpiCards.forEach((card) => card.render(kpiGrid));
  container.appendChild(kpiGrid);

  const chartSection = document.createElement('div');
  chartSection.className = 'chart-section';
  revenueChart = new RevenueChart();
  revenueChart.render(chartSection);
  managerPerformance = new ManagerPerformance();
  managerPerformance.render(chartSection);
  container.appendChild(chartSection);

  monthPickerModal = new MonthPickerModal();
  monthPickerModal.render(container);
}

/**
 * 대시보드 페이지 활성화 시 호출: DOM이 비어 있으면 렌더 후 데이터 로드.
 * 페이지 전환 후 차트 캔버스가 없을 수 있으므로, 없으면 컨테이너를 비우고 init 재실행.
 */
export function initDashboardPage(): void {
  const container = document.getElementById('dashboard-page');
  if (!container) return;
  if (container.children.length === 0) {
    init(container);
  }
  // 페이지 전환 후 destroy로 DOM이 비워진 경우 등, 차트 캔버스가 없으면 재렌더
  if (!document.getElementById('monthly-chart') || !document.getElementById('weekly-chart')) {
    container.innerHTML = '';
    init(container);
  }
  loadDashboardCharts();
}

/**
 * 대시보드 DOM 제거 (라우터 전환 등에서 사용).
 * 컨테이너를 비워서 재진입 시 init()이 다시 실행되도록 함.
 */
export function destroy(): void {
  kpiCards.forEach((c) => c.destroy());
  kpiCards = [];
  revenueChart?.destroy();
  revenueChart = null;
  managerPerformance?.destroy();
  managerPerformance = null;
  monthSelector?.destroy();
  monthSelector = null;
  monthPickerModal?.destroy();
  monthPickerModal = null;
  resetDashboardMonthSelectorSetup();
  const container = document.getElementById('dashboard-page');
  if (container) container.innerHTML = '';
}
