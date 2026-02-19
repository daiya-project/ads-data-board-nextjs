/**
 * Reports Feature — JS-First rendering for Daily/Weekly Report page.
 * Renders DOM with IDs expected by existing loadDailyReport, loadWeeklyReport, setupDailyReportFilters, setupWeeklyReportFilters, setupStatusCardClickHandlers.
 */

import './reports-page.css';
import { StatusCards } from './components/StatusCards';
import { ReportFilters } from './components/ReportFilters';
import { ReportTable } from './components/ReportTable';
import { loadDailyReport } from './lib/daily/load';
import { loadWeeklyReport } from './lib/weekly/load';
import { setupDailyReportFilters } from './lib/daily/events';
import { setupWeeklyReportFilters } from './lib/weekly/events';

export { loadDailyReport, loadWeeklyReport };
export { setupDailyReportFilters, setupWeeklyReportFilters };
import { setupStatusCardClickHandlers } from '@shared/lib';

let dailyStatusCards: StatusCards | null = null;
let dailyFilters: ReportFilters | null = null;
let dailyTable: ReportTable | null = null;
let weeklyStatusCards: StatusCards | null = null;
let weeklyFilters: ReportFilters | null = null;
let weeklyTable: ReportTable | null = null;

function renderTab(
  container: HTMLElement,
  kind: 'daily' | 'weekly',
  isActive: boolean
): void {
  const tabClass = kind === 'daily' ? 'tab-content active' : 'tab-content';
  const tabId = kind === 'daily' ? 'daily-tab' : 'weekly-tab';
  const filterId = kind === 'daily' ? 'daily-status-filter' : 'weekly-status-filter';

  const tab = document.createElement('div');
  tab.className = tabClass;
  tab.id = tabId;
  tab.innerHTML = `<input type="hidden" id="${filterId}" value="">`;
  container.appendChild(tab);

  const statusCards = new StatusCards(kind);
  statusCards.render(tab);
  if (kind === 'daily') dailyStatusCards = statusCards;
  else weeklyStatusCards = statusCards;

  const reportSection = document.createElement('div');
  reportSection.className = 'report-section';
  tab.appendChild(reportSection);

  const filters = new ReportFilters(kind);
  filters.render(reportSection);
  if (kind === 'daily') dailyFilters = filters;
  else weeklyFilters = filters;

  const table = new ReportTable(kind);
  table.render(reportSection);
  if (kind === 'daily') dailyTable = table;
  else weeklyTable = table;
}

/**
 * Renders the full Sales Report page (daily + weekly tabs) into container.
 */
export function init(container: HTMLElement): void {
  if (container.children.length > 0) return;

  renderTab(container, 'daily', true);
  renderTab(container, 'weekly', false);
}

/**
 * Called when Sales Report page becomes active: ensure DOM is mounted then load data.
 */
export function initReportsPage(): void {
  const container = document.getElementById('sales-report-page');
  if (!container) return;
  if (container.children.length === 0) {
    init(container);
    setupDailyReportFilters();
    setupWeeklyReportFilters();
    setupStatusCardClickHandlers(loadDailyReport, loadWeeklyReport);
  }
  const activeSubItem = document.querySelector('.Sidebar__navItem[data-page="sales-report"] .Sidebar__subItem.active');
  const subPageId = activeSubItem?.getAttribute('data-sub-page');
  const dailyTab = document.getElementById('daily-tab');
  const weeklyTab = document.getElementById('weekly-tab');
  if (subPageId === 'weekly') {
    if (weeklyTab) weeklyTab.classList.add('active');
    if (dailyTab) dailyTab.classList.remove('active');
    loadWeeklyReport();
  } else {
    if (dailyTab) dailyTab.classList.add('active');
    if (weeklyTab) weeklyTab.classList.remove('active');
    loadDailyReport();
  }
}

/**
 * Destroy report DOM and references (e.g. on route change).
 */
export function destroy(): void {
  dailyStatusCards?.destroy();
  dailyStatusCards = null;
  dailyFilters?.destroy();
  dailyFilters = null;
  dailyTable?.destroy();
  dailyTable = null;
  weeklyStatusCards?.destroy();
  weeklyStatusCards = null;
  weeklyFilters?.destroy();
  weeklyFilters = null;
  weeklyTable?.destroy();
  weeklyTable = null;
}
