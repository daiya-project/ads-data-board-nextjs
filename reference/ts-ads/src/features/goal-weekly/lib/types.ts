/**
 * Goal Weekly Feature — 도메인 타입
 */

import type { GoalWithRevenue } from '@shared/types';

export type { GoalWithRevenue };

/** 주차별 그룹 (main.js flow: data.js / render.js) */
export interface WeekGroup {
  weekKey: string;
  startDate: Date;
  goals: GoalWithRevenue[];
}

/** 주차 네비게이션 상태 (main.js flow) */
export interface WeekNavigationState {
  weeksOffset: number;
  nextWeekOffset: number;
  loadedRange: { startOffset: number; endOffset: number };
}

/** Weekly Goal 전역 상태 (main.js flow) */
export interface WeeklyGoalState {
  allWeeksData?: WeekGroup[] | null;
  weekNavigationState?: WeekNavigationState;
  currentContentArea?: HTMLElement | null;
  currentShowSummary?: boolean;
  currentManagerTabId?: number | null;
}

/** 주차 데이터 (week-navigation flow: offset 기반) */
export interface WeekData {
  offset: number;
  goals: GoalWithRevenue[];
  startDate: Date;
  endDate?: Date;
  week_id?: string;
  week_label?: string;
}

/** getWeeksForNavigation 결과 */
export interface NavWeeksResult {
  weeks: WeekGroup[];
  layout: '3col';
  columnConfig: Record<string, string>;
}
