/**
 * Goal Weekly Feature — 주간 네비게이션 상태
 */

import type { WeekData } from '../../lib/types';

export interface WeekConfig {
  offset: number;
  width: string;
  isCurrentWeek: boolean;
}

export interface LayoutConfigResult {
  layout: '3-column';
  weeks: WeekConfig[];
}

export const weekNavigationState = {
  offset: 0,
  currentWeekDate: new Date(),
  loadedWeeks: new Map<number, WeekData>(),
  maxOffset: 1,
};

export function getLayoutConfig(offset: number): LayoutConfigResult {
  return {
    layout: '3-column',
    weeks: [
      { offset: offset - 1, width: '33%', isCurrentWeek: offset - 1 === 0 },
      { offset: offset, width: '33%', isCurrentWeek: offset === 0 },
      { offset: offset + 1, width: '33%', isCurrentWeek: offset + 1 === 0 },
    ],
  };
}

export function navigateLeft(): boolean {
  weekNavigationState.offset--;
  return true;
}

export function navigateRight(): boolean {
  if (weekNavigationState.offset < weekNavigationState.maxOffset) {
    weekNavigationState.offset++;
    return true;
  }
  return false;
}

export function resetNavigationState(): void {
  weekNavigationState.offset = 0;
  weekNavigationState.currentWeekDate = new Date();
  weekNavigationState.loadedWeeks.clear();
}

export function setWeekData(offset: number, data: WeekData): void {
  weekNavigationState.loadedWeeks.set(offset, data);
}

export function getWeekData(offset: number): WeekData | null {
  return weekNavigationState.loadedWeeks.get(offset) ?? null;
}

export function getNavigationButtons(offset: number): {
  showLeft: boolean;
  showRight: boolean;
  leftWeekOffset: number;
  rightWeekOffset: number;
} {
  const config = getLayoutConfig(offset);
  const weeks = config.weeks;
  const showLeft = true;
  const leftWeekOffset = weeks[0].offset;
  const showRight = offset < weekNavigationState.maxOffset;
  const rightWeekOffset = weeks[weeks.length - 1].offset;
  return { showLeft, showRight, leftWeekOffset, rightWeekOffset };
}
