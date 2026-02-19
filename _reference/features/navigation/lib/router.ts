/**
 * 라우터 — 라우트 매칭, 페이지 전환, 동적 import·코드 스플리팅
 */

import { getCachedElements, getCachedElementById, getCachedElement } from '../../../shared/lib/cache';
import { devLog } from '@shared/lib';
import { getLatestMonthFromDb } from '../../../shared/lib/getLatestMonthFromDb';
import { featureLoaders, routeKey } from './route-config';
import type { PageInitCallbacks } from './types';
import type { CurrentFeatureHandle } from './types';

let pageCallbacks: PageInitCallbacks | null = null;

export function setPageInitCallbacks(callbacks: PageInitCallbacks): void {
  pageCallbacks = callbacks;
}

/** 현재 활성 Feature (페이지 이탈 시 destroy 호출용) */
let currentFeature: CurrentFeatureHandle = {};

async function runCurrentDestroy(): Promise<void> {
  if (currentFeature.destroy) {
    try {
      currentFeature.destroy();
    } finally {
      currentFeature = {};
    }
  }
}

/**
 * 페이지 활성화: 이전 Feature destroy → 동적 로드 → init
 */
function handlePageActivation(pageId: string): void {
  const run = async (): Promise<void> => {
    await runCurrentDestroy();

    if (pageId === 'sales-report') {
      const dailySubItem = getCachedElement('.Sidebar__navItem[data-page="sales-report"] .Sidebar__subItem[data-sub-page="daily"]');
      const weeklySubItem = getCachedElement('.Sidebar__navItem[data-page="sales-report"] .Sidebar__subItem[data-sub-page="weekly"]');
      if (dailySubItem) dailySubItem.classList.add('active');
      if (weeklySubItem) weeklySubItem.classList.remove('active');
      const mod = await featureLoaders['sales-report']!();
      mod.initReportsPage();
      currentFeature = { destroy: mod.destroy };
      return;
    }
    if (pageId === 'dashboard') {
      const mod = await featureLoaders.dashboard!();
      mod.initDashboardPage();
      currentFeature = { destroy: mod.destroy };
      return;
    }
    if (pageId === 'goal') {
      const goalTabContents = getCachedElements('#goal-page .tab-content');
      goalTabContents.forEach((c) => c.classList.remove('active'));
      const goalMonthlyTab = getCachedElementById('goal-monthly-tab');
      if (goalMonthlyTab) goalMonthlyTab.classList.add('active');
      const goalSubItems = getCachedElements('.Sidebar__navItem[data-page="goal"] .Sidebar__subItem');
      goalSubItems.forEach((s) => s.classList.remove('active'));
      const monthlySubItem = getCachedElement('.Sidebar__navItem[data-page="goal"] .Sidebar__subItem[data-sub-page="monthly"]');
      if (monthlySubItem) monthlySubItem.classList.add('active');

      const modMonthly = await featureLoaders['goal/monthly']!();
      if (typeof (modMonthly as { state?: { selectedManagerId: unknown; selectedMonth: string } }).state !== 'undefined') {
        const state = (modMonthly as { state: { selectedManagerId: unknown; selectedMonth: string }; setActiveManagerTab: (id: unknown) => void }).state;
        state.selectedManagerId = null;
        (modMonthly as { setActiveManagerTab: (id: null) => void }).setActiveManagerTab(null);
      }
      const defaultMonth = await getLatestMonthFromDb();
      if (typeof (modMonthly as { state?: { selectedMonth: string } }).state !== 'undefined') {
        (modMonthly as { state: { selectedMonth: string } }).state.selectedMonth = defaultMonth;
      }
      (modMonthly as { updateMonthDisplay: () => void }).updateMonthDisplay();
      await (modMonthly as { initGoalMonthly: () => Promise<void> }).initGoalMonthly();
      currentFeature = { destroy: (modMonthly as { destroy?: () => void }).destroy };
      return;
    }
    if (pageId === 'setting') {
      const mod = await featureLoaders['setting/manager-setting']!();
      mod.initSettingsPage();
      const settingTabContents = getCachedElements('#setting-page .tab-content');
      settingTabContents.forEach((c) => c.classList.remove('active'));
      const managerSettingTab = getCachedElementById('manager-setting-tab');
      if (managerSettingTab) managerSettingTab.classList.add('active');
      const settingSubItems = getCachedElements('.Sidebar__navItem[data-page="setting"] .Sidebar__subItem');
      settingSubItems.forEach((s) => s.classList.remove('active'));
      const managerSettingSubItem = getCachedElement('.Sidebar__navItem[data-page="setting"] .Sidebar__subItem[data-sub-page="manager-setting"]');
      if (managerSettingSubItem) {
        managerSettingSubItem.classList.add('active');
        setTimeout(() => pageCallbacks?.loadManagerSetting(), 0);
      }
      currentFeature = {};
      return;
    }
  };
  setTimeout(() => run(), 0);
}

/**
 * 서브 페이지 활성화 (Sales Report Daily/Weekly, Goal Monthly/Weekly, Setting Goal/Manager)
 */
function handleSubPageActivation(pageId: string, subPageId: string): void {
  const run = async (): Promise<void> => {
    const key = routeKey(pageId, subPageId);
    const loader = featureLoaders[key];
    if (!loader) return;

    if (pageId === 'sales-report') {
      const reportTabContents = getCachedElements('#sales-report-page .tab-content');
      reportTabContents.forEach((c) => c.classList.remove('active'));
      const targetTab = getCachedElementById(`${subPageId}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
        const mod = await loader() as { initReportsPage: () => void; loadDailyReport: () => void; loadWeeklyReport: () => void };
        mod.initReportsPage();
        if (subPageId === 'daily') mod.loadDailyReport();
        else if (subPageId === 'weekly') mod.loadWeeklyReport();
        currentFeature = { destroy: (mod as { destroy?: () => void }).destroy };
      }
      return;
    }
    if (pageId === 'goal') {
      const goalTabContents = getCachedElements('#goal-page .tab-content');
      goalTabContents.forEach((c) => c.classList.remove('active'));
      const targetTab = getCachedElementById(`goal-${subPageId}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
        if (subPageId === 'weekly') {
          const mod = await featureLoaders['goal/weekly']!();
          setTimeout(() => {
            pageCallbacks?.loadGoalManagerOptions();
            pageCallbacks?.initLoadManagerTabs();
            pageCallbacks?.setupRegisterButtonListener();
          }, 0);
          currentFeature = {};
        } else if (subPageId === 'monthly') {
          await runCurrentDestroy();
          const modMonthly = await featureLoaders['goal/monthly']!();
          const state = (modMonthly as { state?: { selectedManagerId: unknown; selectedMonth: string } }).state;
          if (state) {
            state.selectedManagerId = null;
            (modMonthly as { setActiveManagerTab: (id: null) => void }).setActiveManagerTab(null);
          }
          const defaultMonth = await getLatestMonthFromDb();
          if (state) state.selectedMonth = defaultMonth;
          (modMonthly as { updateMonthDisplay: () => void }).updateMonthDisplay();
          await (modMonthly as { initGoalMonthly: () => Promise<void> }).initGoalMonthly();
          currentFeature = { destroy: (modMonthly as { destroy?: () => void }).destroy };
        }
      }
      return;
    }
    if (pageId === 'setting') {
      const mod = await featureLoaders[key]!();
      (mod as { initSettingsPage: () => void }).initSettingsPage();
      const settingTabContents = getCachedElements('#setting-page .tab-content');
      settingTabContents.forEach((c) => c.classList.remove('active'));
      const targetTab = getCachedElementById(`${subPageId}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
        if (subPageId === 'goal-setting') {
          const gw = await featureLoaders['goal/weekly']!();
          await (gw as { loadGoalSetting: () => Promise<unknown> }).loadGoalSetting();
          await pageCallbacks?.setupGoalSettingEvents();
        } else if (subPageId === 'manager-setting') {
          pageCallbacks?.loadManagerSetting();
        }
      }
      currentFeature = {};
    }
  };
  setTimeout(() => run(), 0);
}

/**
 * 메인 네비게이션 설정
 */
export function setupNavigation(): void {
  const navItems = getCachedElements('.Sidebar__navItem');
  const pages = getCachedElements('.page');

  navItems.forEach((item) => {
    item.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.preventDefault();
      navItems.forEach((nav) => nav.classList.remove('active'));
      this.classList.add('active');
      pages.forEach((page) => page.classList.remove('active'));
      const pageId = this.getAttribute('data-page');
      const targetPage = getCachedElementById(`${pageId}-page`);
      if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo({ top: 0 });
        (targetPage as HTMLElement).scrollTop = 0;
        devLog(`[Page Navigation] Switching to: ${pageId}`);
        handlePageActivation(pageId ?? '');
      }
    });
  });
}

/**
 * 서브 네비게이션 설정
 */
export function setupSubNavigation(): void {
  const subItems = getCachedElements('.Sidebar__subItem');
  subItems.forEach((item) => {
    item.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.preventDefault();
      e.stopPropagation();
      const parentNavItem = this.closest('.Sidebar__navItem') as HTMLElement | null;
      if (!parentNavItem) return;
      const pageId = parentNavItem.getAttribute('data-page');
      const samePageSubItems = parentNavItem.querySelectorAll('.Sidebar__subItem');
      samePageSubItems.forEach((s) => s.classList.remove('active'));
      this.classList.add('active');
      window.scrollTo({ top: 0 });
      const subPageId = this.getAttribute('data-sub-page');
      handleSubPageActivation(pageId ?? '', subPageId ?? '');
    });
  });
}

/**
 * 매니저 탭 전환 설정 (페이지 내 탭)
 */
export function setupManagerTabs(): void {
  const managerTabBtns = getCachedElements('.manager-tabs .tab-btn');
  const managerTabContents = getCachedElements('.manager-tab-content');
  managerTabBtns.forEach((btn) => {
    btn.addEventListener('click', function (this: HTMLElement) {
      managerTabBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      managerTabContents.forEach((c) => c.classList.remove('active'));
      const tabId = this.getAttribute('data-manager-tab');
      const targetTab = getCachedElementById(`manager-${tabId}-tab`);
      if (targetTab) targetTab.classList.add('active');
    });
  });
}

/**
 * 초기 활성 페이지 로드 (코드 스플리팅 적용).
 * bootstrap에서 initRouter 직후 호출.
 */
export function runInitialPageActivation(): void {
  const activePage = document.querySelector('.page.active') as HTMLElement | null;
  if (!activePage) return;
  const id = activePage.id;
  if (id === 'dashboard-page') {
    handlePageActivation('dashboard');
    return;
  }
  if (id === 'sales-report-page') {
    handlePageActivation('sales-report');
    return;
  }
  if (id === 'goal-page') {
    const activeSub = document.querySelector('.Sidebar__navItem[data-page="goal"] .Sidebar__subItem.active');
    const subPage = activeSub?.getAttribute('data-sub-page');
    if (subPage === 'weekly') {
      handleSubPageActivation('goal', 'weekly');
    } else {
      handlePageActivation('goal');
    }
    return;
  }
  if (id === 'setting-page') {
    handlePageActivation('setting');
    return;
  }
}
