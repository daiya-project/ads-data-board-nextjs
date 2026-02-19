/**
 * Goal Weekly Feature — 주간 목표 데이터 로드 (전체/매니저별)
 */

import { getManagerList } from '@shared/api';
import { getCachedElementById } from '@shared/lib';
import { loadGoalsWithRevenue } from './goal-data';
import { groupGoalsByWeek, filterWeeksAroundCurrent } from './week-utils';
import type { SupabaseClient } from '@shared/types';
import type { WeekGroup, WeeklyGoalState } from './types';
import type { GoalWithRevenue } from '@shared/types';

export async function loadAllManagersGoals(
  contentArea: HTMLElement | null,
  supabase: SupabaseClient | null,
  renderGoalCards: (
    container: HTMLElement,
    weeks: WeekGroup[],
    showSummary: boolean
  ) => void,
  state: WeeklyGoalState
): Promise<void> {
  if (!contentArea || !supabase) return;

  contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중...</p>';

  try {
    let managers = await getManagerList();
    if (!managers) return;
    managers = (managers as { id: number; manager_name?: string }[]).filter(
      (m) => m.id !== 98 && m.id !== 99
    );
    if (managers.length === 0) {
      contentArea.innerHTML = '<p class="empty-state">등록된 매니저가 없습니다.</p>';
      return;
    }

    const managerIds = managers.map((m) => m.id);
    const { data: goals, error } = await supabase
      .from('ads_data_goal')
      .select(
        'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, updated_at'
      )
      .in('manager_id', managerIds)
      .eq('activate', true)
      .order('start_date', { ascending: false });

    if (error) {
      contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</p>';
      return;
    }
    const goalsList = (goals as GoalWithRevenue[]) ?? [];
    if (goalsList.length === 0) {
      contentArea.innerHTML = '<p class="empty-state">등록된 목표가 없습니다.</p>';
      return;
    }

    const weeklyGoals = goalsList.filter((g) => g.period_type === 'weekly');
    if (weeklyGoals.length === 0) {
      contentArea.innerHTML = '<p class="empty-state">등록된 주간 목표가 없습니다.</p>';
      return;
    }

    const goalsWithRevenue = await loadGoalsWithRevenue(weeklyGoals);
    const goalsByWeek = groupGoalsByWeek(goalsWithRevenue);

    state.allWeeksData = goalsByWeek;
    state.weekNavigationState = {
      weeksOffset: 0,
      nextWeekOffset: 0,
      loadedRange: { startOffset: -2, endOffset: 2 },
    };
    state.currentContentArea = contentArea;
    state.currentShowSummary = true;

    const filteredWeeks = filterWeeksAroundCurrent(goalsByWeek);
    renderGoalCards(contentArea, filteredWeeks, true);
  } catch (error) {
    console.error('목표 데이터 로드 오류:', error);
    contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</p>';
  }
}

export async function loadManagerGoals(
  managerId: number,
  contentArea: HTMLElement | null,
  supabase: SupabaseClient | null,
  renderGoalCards: (
    container: HTMLElement,
    weeks: WeekGroup[],
    showSummary: boolean
  ) => void,
  state: WeeklyGoalState,
  forceRefreshGoalIds: number[] = []
): Promise<void> {
  if (!contentArea || !supabase) return;

  contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중...</p>';

  try {
    const { data: goals, error } = await supabase
      .from('ads_data_goal')
      .select(
        'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, updated_at'
      )
      .eq('manager_id', managerId)
      .eq('activate', true)
      .order('start_date', { ascending: false });

    if (error) {
      contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</p>';
      return;
    }
    const goalsList = (goals as GoalWithRevenue[]) ?? [];
    if (goalsList.length === 0) {
      contentArea.innerHTML = '<p class="empty-state">등록된 목표가 없습니다.</p>';
      return;
    }

    const weeklyGoals = goalsList.filter((g) => g.period_type === 'weekly');
    if (weeklyGoals.length === 0) {
      contentArea.innerHTML = '<p class="empty-state">등록된 주간 목표가 없습니다.</p>';
      return;
    }

    const goalsWithRevenue = await loadGoalsWithRevenue(
      weeklyGoals,
      false,
      forceRefreshGoalIds
    );
    const goalsByWeek = groupGoalsByWeek(goalsWithRevenue);

    state.allWeeksData = goalsByWeek;
    state.weekNavigationState = {
      weeksOffset: 0,
      nextWeekOffset: 0,
      loadedRange: { startOffset: -2, endOffset: 2 },
    };
    state.currentContentArea = contentArea;
    state.currentShowSummary = false;

    const filteredWeeks = filterWeeksAroundCurrent(goalsByWeek);
    renderGoalCards(contentArea, filteredWeeks, false);
  } catch (error) {
    console.error('목표 데이터 로드 오류:', error);
    contentArea.innerHTML = '<p class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</p>';
  }
}
