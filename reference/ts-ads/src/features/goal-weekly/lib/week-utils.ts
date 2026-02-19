/**
 * Goal Weekly Feature — 주차 유틸리티
 */

import { CATEGORY_ORDER } from '@shared/lib';
import type { WeekGroup, WeekNavigationState, NavWeeksResult, GoalWithRevenue } from './types';

export function groupGoalsByWeek(goals: GoalWithRevenue[]): WeekGroup[] {
  const weekMap = new Map<string, WeekGroup>();

  goals.forEach((goal) => {
    const startDate = new Date(goal.start_date!);
    const weekKey = getWeekKey(startDate);

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { weekKey, startDate, goals: [] });
    }
    weekMap.get(weekKey)!.goals.push(goal);
  });

  const weeks = Array.from(weekMap.values()).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  weeks.forEach((week) => {
    week.goals.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.goal_category as string] ?? 999;
      const orderB = CATEGORY_ORDER[b.goal_category as string] ?? 999;
      return orderA - orderB;
    });
  });
  return weeks;
}

export function filterWeeksAroundCurrent(weeks: WeekGroup[]): WeekGroup[] {
  if (weeks.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);
  currentMonday.setHours(0, 0, 0, 0);

  let currentWeekIndex = -1;
  let minDiff = Infinity;
  weeks.forEach((week, index) => {
    const weekMonday = new Date(week.startDate);
    weekMonday.setHours(0, 0, 0, 0);
    const d = Math.abs(weekMonday.getTime() - currentMonday.getTime());
    if (d < minDiff) {
      minDiff = d;
      currentWeekIndex = index;
    }
  });
  if (currentWeekIndex === -1) currentWeekIndex = 0;

  const startIndex = Math.max(0, currentWeekIndex - 1);
  const endIndex = Math.min(weeks.length, startIndex + 3);
  return weeks.slice(startIndex, endIndex);
}

export function getWeeksForNavigation(
  allWeeks: WeekGroup[],
  navigationState: WeekNavigationState
): NavWeeksResult {
  if (!allWeeks || allWeeks.length === 0) {
    return { weeks: [], layout: '3col', columnConfig: { col1: '지난 주', col2: '이번 주', col3: '다음 주' } };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);
  currentMonday.setHours(0, 0, 0, 0);

  let currentWeekIndex = -1;
  allWeeks.forEach((week, index) => {
    const weekMonday = new Date(week.startDate);
    weekMonday.setHours(0, 0, 0, 0);
    if (weekMonday.getTime() === currentMonday.getTime()) currentWeekIndex = index;
  });

  if (currentWeekIndex === -1) {
    return {
      weeks: allWeeks.slice(0, Math.min(3, allWeeks.length)),
      layout: '3col',
      columnConfig: { col1: '1주차', col2: '2주차', col3: '3주차' },
    };
  }

  const { weeksOffset } = navigationState;

  const findOrCreateWeek = (mondayDate: Date): WeekGroup => {
    const found = allWeeks.find((w) => {
      const wm = new Date(w.startDate);
      wm.setHours(0, 0, 0, 0);
      return wm.getTime() === mondayDate.getTime();
    });
    return found ?? { startDate: mondayDate, goals: [], weekKey: '' };
  };

  const centerMonday = new Date(currentMonday);
  centerMonday.setDate(centerMonday.getDate() + weeksOffset * 7);
  centerMonday.setHours(0, 0, 0, 0);

  const leftMonday = new Date(centerMonday);
  leftMonday.setDate(leftMonday.getDate() - 7);
  leftMonday.setHours(0, 0, 0, 0);

  const rightMonday = new Date(centerMonday);
  rightMonday.setDate(rightMonday.getDate() + 7);
  rightMonday.setHours(0, 0, 0, 0);

  const leftWeek = findOrCreateWeek(leftMonday);
  const centerWeek = findOrCreateWeek(centerMonday);
  const rightWeek = findOrCreateWeek(rightMonday);

  const labelForOffset = (off: number): string => {
    if (off === 0) return '이번 주';
    if (off === -1) return '지난 주';
    if (off === 1) return '다음 주';
    if (off < -1) return `${Math.abs(off)}주 전`;
    return `${off}주 뒤`;
  };

  return {
    weeks: [leftWeek, centerWeek, rightWeek],
    layout: '3col',
    columnConfig: {
      col1: labelForOffset(weeksOffset - 1),
      col2: labelForOffset(weeksOffset),
      col3: labelForOffset(weeksOffset + 1),
    },
  };
}

export async function extendWeekRangeIfNeeded(
  direction: 'prev' | 'next',
  allWeeksData: WeekGroup[],
  weekNavigationState: WeekNavigationState,
  getSupabaseClientSafe: () => { from: (t: string) => unknown } | null
): Promise<void> {
  if (!allWeeksData) return;
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const { weeksOffset, nextWeekOffset, loadedRange } = weekNavigationState;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);
  currentMonday.setHours(0, 0, 0, 0);

  const requiredStartOffset = weeksOffset;
  const requiredEndOffset = weeksOffset + nextWeekOffset;

  if (direction === 'prev' && requiredStartOffset < loadedRange.startOffset) {
    weekNavigationState.loadedRange.startOffset = requiredStartOffset;
  } else if (direction === 'next' && requiredEndOffset > loadedRange.endOffset) {
    weekNavigationState.loadedRange.endOffset = requiredEndOffset;
  }
}

export function getWeekKey(date: Date | string): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((monday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

export function formatWeekLabel(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day} 주차`;
}

export function getWeekLabel(offset: number): string {
  if (offset === 0) return '이번 주';
  if (offset === -1) return '지난 주';
  if (offset === 1) return '다음 주';
  if (offset < -1) return `${Math.abs(offset)}주 전`;
  return `${offset}주 뒤`;
}

export function getWeekDateRange(offset: number): string {
  const today = new Date();
  const currentMonday = getMonday(today);
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(currentMonday.getDate() + offset * 7);
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  const fmt = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  };
  return `${fmt(targetMonday)} ~ ${fmt(targetSunday)}`;
}

export function getWeekStartDate(offset: number): Date {
  const today = new Date();
  const currentMonday = getMonday(today);
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(currentMonday.getDate() + offset * 7);
  targetMonday.setHours(0, 0, 0, 0);
  return targetMonday;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekBoundsForOffset(offset: number): {
  week_id: string;
  start_date: string;
  end_date: string;
  week_label?: string;
} {
  const monday = getWeekStartDate(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    week_id: getWeekKey(monday),
    start_date: toLocalDateString(monday),
    end_date: toLocalDateString(sunday),
    week_label: formatWeekLabel(monday),
  };
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
