/**
 * Goal Weekly Feature — 상태 관리
 */

import type { WeekGroup, WeekNavigationState } from './types';

declare global {
  interface Window {
    weeklyGoalState?: WeeklyGoalMainState;
  }
}

export interface DatePickerState {
  currentDate: Date;
  selectedDate: Date | null;
  targetInputId: string | null;
}

export interface WeeklyGoalMainState {
  currentManagerTabId: number | null;
  datePickerState: DatePickerState;
  weekNavigationState: WeekNavigationState;
  allWeeksData: WeekGroup[] | null;
  currentContentArea: HTMLElement | null;
  currentShowSummary: boolean;
}

export const weeklyGoalState: WeeklyGoalMainState = {
  currentManagerTabId: null,
  datePickerState: {
    currentDate: new Date(),
    selectedDate: null,
    targetInputId: null
  },
  weekNavigationState: {
    weeksOffset: 0,
    nextWeekOffset: 0,
    loadedRange: { startOffset: -2, endOffset: +2 }
  },
  allWeeksData: null,
  currentContentArea: null,
  currentShowSummary: false
};

export function exposeWeeklyGoalState(): void {
  window.weeklyGoalState = weeklyGoalState;
}

export function resetWeeklyGoalState(): void {
  weeklyGoalState.currentManagerTabId = null;
  weeklyGoalState.datePickerState = {
    currentDate: new Date(),
    selectedDate: null,
    targetInputId: null
  };
  weeklyGoalState.weekNavigationState = {
    weeksOffset: 0,
    nextWeekOffset: 0,
    loadedRange: { startOffset: -2, endOffset: +2 }
  };
  weeklyGoalState.allWeeksData = null;
  weeklyGoalState.currentContentArea = null;
  weeklyGoalState.currentShowSummary = false;
}

export function setCurrentManagerTab(managerId: number | null): void {
  weeklyGoalState.currentManagerTabId = managerId;
}

export function getCurrentManagerTabId(): number | null {
  return weeklyGoalState.currentManagerTabId;
}

export function setCurrentContentArea(area: HTMLElement | null): void {
  weeklyGoalState.currentContentArea = area;
}

export function setAllWeeksData(data: WeekGroup[] | null): void {
  weeklyGoalState.allWeeksData = data;
}

export function getDatePickerState(): DatePickerState {
  return weeklyGoalState.datePickerState;
}
