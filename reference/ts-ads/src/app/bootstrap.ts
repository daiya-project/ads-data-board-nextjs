/**
 * 앱 초기화 (app/bootstrap.ts)
 * 캐시·상태·라우터·페이지별 콜백 구성. Feature init/destroy는 navigation에서 처리.
 */

import { preCacheCommonElements, domCache, chartRegistry, requestManager, devLog } from '@shared/lib';
import { getSupabaseClientSafe } from '@shared/api';
import { setupDailyReportFilters, setupWeeklyReportFilters, loadDailyReport, loadWeeklyReport } from '../features/reports';
import {
  loadManagerTabs,
  switchToAllManagersNavigation,
  switchManagerNavigation,
  weeklyGoalState,
  exposeWeeklyGoalState,
  setCurrentManagerTab,
  openGoalModal,
  setExternalState,
  renderGoalRegisterModal,
  renderGoalDetailModal,
  setupActionGlobals,
  goalRegisterState,
  createGoalRegisterContext,
  setupGlobalContext,
  setLoadManagerGoalsCallback,
  loadGoalManagerOptions,
} from '../features/goal-weekly';
import {
  setupGoalSettingEvents as setupGoalSettingEventsModule,
  enableCellEdit as enableCellEditModule,
  saveCellEditDirect as saveCellEditDirectModule,
  cancelCellEditDirect as cancelCellEditDirectModule,
  updateTotalAndGap as updateTotalAndGapModule,
  loadManagerSetting as loadManagerSettingModule,
  loadBulkManagerSelect as loadBulkManagerSelectModule,
  saveSelectedManagers as saveSelectedManagersModule,
  setupManagerSettingEvents as setupManagerSettingEventsModule,
} from '../features/settings';
import { setupStatusCardClickHandlers as setupStatusCardClickHandlersModule, showToast as showToastModule } from '@shared/lib';
import { initRouter, type PageInitCallbacks } from '../features/navigation';
import { AppShell } from '../shared/ui/common/AppShell';
import { renderDataUpdateModal, setupDataUpdateModal } from '../shared/ui/modals/DataUpdateModal';
import { setupAllGoalEvents } from '../features/goal-weekly';

/** Goal Setting: 셀 편집·저장·취소·합계 갱신을 연결한 래퍼 (Feature 간 의존성 주입) */
const updateTotalAndGap = (row: Element): void => updateTotalAndGapModule(row);
const saveCellEditDirect = (cell: HTMLElement): Promise<void> =>
  saveCellEditDirectModule(cell, updateTotalAndGap);
const cancelCellEditDirect = (cell: HTMLElement): void => cancelCellEditDirectModule(cell);
const enableCellEdit = (cell: HTMLElement): void =>
  enableCellEditModule(cell, saveCellEditDirect, cancelCellEditDirect);
const setupGoalSettingEvents = (): Promise<void> => setupGoalSettingEventsModule(enableCellEdit);

const setupManagerSettingEvents = (): void =>
  setupManagerSettingEventsModule(loadManagerSetting, saveSelectedManagers);
const loadManagerSetting = (): Promise<void> =>
  loadManagerSettingModule(loadBulkManagerSelect, setupManagerSettingEvents);
const saveSelectedManagers = (): Promise<void> => saveSelectedManagersModule(loadManagerSetting);
const loadBulkManagerSelect = (): Promise<void> => loadBulkManagerSelectModule();

async function loadAllManagersGoals(): Promise<void> {
  const contentArea = document.getElementById('manager-content-area');
  if (!contentArea) {
    devLog('[loadAllManagersGoals] manager-content-area를 찾을 수 없음');
    return;
  }
  setCurrentManagerTab(null);
  try {
    await switchToAllManagersNavigation(contentArea);
    devLog('[loadAllManagersGoals] 모든 매니저 목표 로드 완료');
  } catch (error) {
    devLog('[loadAllManagersGoals] 로드 오류:', error);
  }
}

async function loadManagerGoals(managerId: number, _forceRefreshGoalIds: number[] = []): Promise<void> {
  const contentArea = document.getElementById('manager-content-area');
  if (!getSupabaseClientSafe() || !contentArea) return;
  setCurrentManagerTab(managerId);
  try {
    await switchManagerNavigation(contentArea, managerId);
    devLog(`[loadManagerGoals] 매니저 ${managerId} 목표 로드 완료`);
  } catch (error) {
    devLog(`[loadManagerGoals] 매니저 ${managerId} 로드 오류:`, error);
  }
}

async function initLoadManagerTabs(): Promise<void> {
  return loadManagerTabs(loadAllManagersGoals, loadManagerGoals, weeklyGoalState as Parameters<typeof loadManagerTabs>[2]);
}

function setupRegisterButtonListener(): void {
  const openModalBtn = document.getElementById('open-goal-modal-btn');
  if (!openModalBtn) {
    devLog('등록 버튼을 찾을 수 없습니다!');
    return;
  }
  const newBtn = openModalBtn.cloneNode(true) as HTMLElement;
  openModalBtn.parentNode?.replaceChild(newBtn, openModalBtn);
  newBtn.addEventListener('click', async (e: Event) => {
    e.stopPropagation();
    window.goalRegisterContext = createGoalRegisterContext();
    await openGoalModal(window.goalRegisterContext);
  });
}

export function runApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    devLog('[App] #app not found');
    return;
  }

  const appShell = new AppShell();
  appShell.render(app);
  renderDataUpdateModal(app);
  renderGoalRegisterModal(document.body);
  renderGoalDetailModal(document.body);

  const pendingToast = localStorage.getItem('data-update-toast');
  if (pendingToast) {
    localStorage.removeItem('data-update-toast');
    setTimeout(() => showToastModule(pendingToast), 500);
  }

  preCacheCommonElements();
  domCache.preCacheCommon();
  devLog('[Phase 1] Performance utilities initialized:', {
    domCacheSize: domCache.size,
    chartRegistrySize: chartRegistry.size,
    pendingRequests: requestManager.pendingCount
  });

  exposeWeeklyGoalState();
  setExternalState(goalRegisterState as Parameters<typeof setExternalState>[0]);
  setupGlobalContext();
  setLoadManagerGoalsCallback(loadManagerGoals);
  setupActionGlobals();

  setupDailyReportFilters();
  setupWeeklyReportFilters();
  setupStatusCardClickHandlersModule(loadDailyReport, loadWeeklyReport);

  const pageCallbacks: PageInitCallbacks = {
    initLoadManagerTabs,
    loadGoalManagerOptions,
    setupRegisterButtonListener,
    setupGoalSettingEvents,
    loadManagerSetting
  };
  initRouter(pageCallbacks);

  setupDataUpdateModal();
  setupAllGoalEvents();
  devLog('[App] 초기화 완료');
}
