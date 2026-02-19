/**
 * Goal Weekly Feature — 주간 네비게이션 메인 컨트롤러
 */

import {
  weekNavigationState,
  getLayoutConfig,
  navigateLeft,
  navigateRight,
  resetNavigationState,
  getWeekData,
} from './navigation-state';
import { renderLayout } from '../../lib/week-layout-renderer';
import { loadWeeklyGoals, loadAllManagersWeeklyGoals, loadSingleWeekGoals } from '../../lib/week-data-loader';
import { openWeekCloneModal } from './week-clone-modal';
import {
  renderWeekCards,
  setupCardEvents,
  setupWeekHeaderEvents,
  invalidateActionItemsCache as invalidateActionItemsCacheFromCards,
} from './week-navigation-cards';

export const invalidateActionItemsCache = invalidateActionItemsCacheFromCards;

let navigationHandler: ((e: MouseEvent) => void) | null = null;
let cloneBtnClickHandler: ((e: MouseEvent) => void) | null = null;

let currentManagerId: number | null = null;

export async function initializeWeekNavigation(
  container: HTMLElement | null,
  managerId: number
): Promise<void> {
  if (!container || !managerId) return;
  currentManagerId = managerId;
  resetNavigationState();
  await loadWeeklyGoals(managerId);
  renderLayout(container, weekNavigationState.offset, true);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
  setupCloneBtnEvents(container);
}

export async function initializeWeekNavigationForAll(
  container: HTMLElement | null
): Promise<void> {
  if (!container) return;
  currentManagerId = null;
  resetNavigationState();
  await loadAllManagersWeeklyGoals();
  renderLayout(container, weekNavigationState.offset, false);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
}

function setupNavigationEvents(container: HTMLElement | null): void {
  if (!container) return;
  if (navigationHandler) container.removeEventListener('click', navigationHandler);

  navigationHandler = async (e: MouseEvent) => {
    const navArrow = (e.target as HTMLElement).closest('.WeekHeader__navArrow');
    if (!navArrow) return;
    e.stopPropagation();
    e.preventDefault();
    const direction = navArrow.getAttribute('data-direction');
    if (direction === 'left') {
      await handleNavigateLeft(container);
    } else if (direction === 'right') {
      await handleNavigateRight(container);
    }
  };

  container.addEventListener('click', navigationHandler);
}

async function handleNavigateLeft(container: HTMLElement): Promise<void> {
  if (!navigateLeft()) return;

  const config = getLayoutConfig(weekNavigationState.offset);
  await ensureWeekDataLoaded(config.weeks.map((w) => w.offset));

  const showClone = currentManagerId !== null;
  renderLayout(container, weekNavigationState.offset, showClone);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
  if (showClone) setupCloneBtnEvents(container);

  prefetchAdjacentWeeks(weekNavigationState.offset);
}

async function handleNavigateRight(container: HTMLElement): Promise<void> {
  if (!navigateRight()) return;

  const config = getLayoutConfig(weekNavigationState.offset);
  await ensureWeekDataLoaded(config.weeks.map((w) => w.offset));

  const showClone = currentManagerId !== null;
  renderLayout(container, weekNavigationState.offset, showClone);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
  if (showClone) setupCloneBtnEvents(container);

  prefetchAdjacentWeeks(weekNavigationState.offset);
}

async function ensureWeekDataLoaded(offsets: number[]): Promise<void> {
  const missing = offsets.filter((o) => !getWeekData(o));
  if (missing.length === 0) return;

  const managerId = currentManagerId;
  await Promise.all(
    missing.map((offset) => {
      if (managerId) {
        return loadSingleWeekGoals(managerId, offset);
      } else {
        return loadAllManagersWeeklyGoals(offset, offset);
      }
    })
  );
}

function prefetchAdjacentWeeks(currentOffset: number): void {
  const config = getLayoutConfig(currentOffset);
  const visibleOffsets = config.weeks.map((w) => w.offset);
  const minVisible = Math.min(...visibleOffsets);
  const maxVisible = Math.max(...visibleOffsets);

  const prefetchOffsets: number[] = [];
  if (!getWeekData(minVisible - 1)) {
    prefetchOffsets.push(minVisible - 1);
  }
  if (maxVisible + 1 <= weekNavigationState.maxOffset && !getWeekData(maxVisible + 1)) {
    prefetchOffsets.push(maxVisible + 1);
  }

  if (prefetchOffsets.length === 0) return;

  const managerId = currentManagerId;
  Promise.all(
    prefetchOffsets.map((offset) => {
      if (managerId) {
        return loadSingleWeekGoals(managerId, offset);
      } else {
        return loadAllManagersWeeklyGoals(offset, offset);
      }
    })
  ).catch(() => {});
}

export function getCurrentNavigationState(): {
  offset: number;
  layoutConfig: ReturnType<typeof getLayoutConfig>;
} {
  return {
    offset: weekNavigationState.offset,
    layoutConfig: getLayoutConfig(weekNavigationState.offset),
  };
}

function setupCloneBtnEvents(container: HTMLElement): void {
  if (!container) return;
  if (cloneBtnClickHandler) container.removeEventListener('click', cloneBtnClickHandler);

  cloneBtnClickHandler = async (e: MouseEvent) => {
    const cloneBtn = (e.target as HTMLElement).closest('.WeekHeader__cloneBtn');
    if (!cloneBtn) return;
    e.stopPropagation();
    e.preventDefault();

    const weekOffset = parseInt(cloneBtn.getAttribute('data-week-offset') ?? '', 10);
    if (isNaN(weekOffset)) return;
    if (currentManagerId === null) return;

    await openWeekCloneModal(weekOffset, currentManagerId);
  };

  container.addEventListener('click', cloneBtnClickHandler);

  if (!(container as HTMLElement & { _cloneRefreshBound?: boolean })._cloneRefreshBound) {
    (container as HTMLElement & { _cloneRefreshBound?: boolean })._cloneRefreshBound = true;
    window.addEventListener('week-goals-cloned', (async (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail?.managerId && detail.managerId === currentManagerId) {
        await refreshWeekNavigation(container, currentManagerId);
      }
    }) as EventListener);
  }
}

export async function refreshWeekNavigation(
  container: HTMLElement | null,
  managerId: number | null
): Promise<void> {
  const config = getLayoutConfig(weekNavigationState.offset);
  const offsets = config.weeks.map((w) => w.offset);
  const minOff = Math.min(...offsets, -2);
  const maxOff = Math.max(...offsets, 2);

  if (managerId) {
    currentManagerId = managerId;
    await loadWeeklyGoals(managerId, minOff, maxOff);
  } else {
    currentManagerId = null;
    await loadAllManagersWeeklyGoals(minOff, maxOff);
  }
  if (container) await renderWeekCards(container, currentManagerId);
}

export async function switchManagerNavigation(
  container: HTMLElement | null,
  managerId: number
): Promise<void> {
  if (!container || !managerId) return;
  currentManagerId = managerId;

  weekNavigationState.loadedWeeks.clear();

  const config = getLayoutConfig(weekNavigationState.offset);
  const offsets = config.weeks.map((w) => w.offset);
  const minOff = Math.min(...offsets, -2);
  const maxOff = Math.max(...offsets, 2);

  await loadWeeklyGoals(managerId, minOff, maxOff);
  renderLayout(container, weekNavigationState.offset, true);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
  setupCloneBtnEvents(container);
}

export async function switchToAllManagersNavigation(
  container: HTMLElement | null
): Promise<void> {
  if (!container) return;
  currentManagerId = null;

  weekNavigationState.loadedWeeks.clear();

  const config = getLayoutConfig(weekNavigationState.offset);
  const offsets = config.weeks.map((w) => w.offset);
  const minOff = Math.min(...offsets, -2);
  const maxOff = Math.max(...offsets, 2);

  await loadAllManagersWeeklyGoals(minOff, maxOff);
  renderLayout(container, weekNavigationState.offset, false);
  await renderWeekCards(container, currentManagerId);
  setupNavigationEvents(container);
}
