/**
 * Goal Weekly Feature — 주간 네비 (이전/다음) 핸들러 (레거시 3col 뷰용)
 */

import { extendWeekRangeIfNeeded, getWeeksForNavigation } from './week-utils';
import type { WeekGroup, WeekNavigationState, WeeklyGoalState } from './types';

export async function handleWeekNavigation(
  direction: 'prev' | 'next',
  state: WeeklyGoalState,
  renderGoalCards: (
    container: HTMLElement,
    weeks: WeekGroup[],
    showSummary: boolean
  ) => void,
  getSupabaseClientSafe: () => unknown
): Promise<void> {
  if (!state.allWeeksData || !state.currentContentArea) return;
  if (!state.weekNavigationState) return;

  await extendWeekRangeIfNeeded(
    direction,
    state.allWeeksData,
    state.weekNavigationState,
    getSupabaseClientSafe as () => { from: (t: string) => unknown } | null
  );

  if (direction === 'prev') {
    if (state.weekNavigationState.nextWeekOffset === 2) {
      state.weekNavigationState.nextWeekOffset = 1;
    } else if (state.weekNavigationState.nextWeekOffset === 1) {
      state.weekNavigationState.nextWeekOffset = 0;
    } else if (
      state.weekNavigationState.weeksOffset === 0 &&
      state.weekNavigationState.nextWeekOffset === 0
    ) {
      state.weekNavigationState.weeksOffset = -1;
    }
  } else {
    if (state.weekNavigationState.weeksOffset === -1) {
      state.weekNavigationState.weeksOffset = 0;
    } else if (
      state.weekNavigationState.weeksOffset === 0 &&
      state.weekNavigationState.nextWeekOffset === 0
    ) {
      state.weekNavigationState.nextWeekOffset = 1;
    } else if (state.weekNavigationState.nextWeekOffset === 1) {
      state.weekNavigationState.nextWeekOffset = 2;
    }
  }

  const navResult = getWeeksForNavigation(
    state.allWeeksData,
    state.weekNavigationState
  );
  renderGoalCards(
    state.currentContentArea,
    navResult.weeks,
    state.currentShowSummary ?? false
  );
}
