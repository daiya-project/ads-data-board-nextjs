/**
 * 목표 등록/수정 - 생성·수정 모드 DB 및 UI 처리
 */

import { getCachedElementById, cache, formatDate } from '@shared/lib';
import { openGoalDetailModal } from '../../../lib/goal-detail-modal';
import { createGoalCard } from '../../GoalCard/card';
import { loadGoalsWithRevenue } from '../../../lib/goal-data';
import { closeModal } from '../ui/modal-controller';
import { resetEditMode } from '../state/register-state';
import {
  calculateWeeklyDates,
  calculateMonthlyDates,
} from '../utils/date-calculator';
import type { GoalRegisterContext } from '@shared/types';
import type { SupabaseClient } from '@shared/types';

export async function handleUpdateMode(params: {
  supabase: SupabaseClient;
  editGoalId: number;
  category: string;
  memo: string;
  goalRevenue: string;
  context: GoalRegisterContext;
  dates: { start_date: string; end_date: string };
  periodType: string;
}): Promise<number> {
  const {
    supabase,
    editGoalId,
    category,
    memo,
    goalRevenue,
    context,
    dates,
    periodType,
  } = params;

  const { error: goalError } = await supabase
    .from('ads_data_goal')
    .update({
      goal_category: category,
      memo: memo || null,
      goal_revenue: parseInt(goalRevenue, 10),
      activate: true,
    })
    .eq('id', editGoalId);

  if (goalError) {
    throw new Error(`목표 수정 오류: ${goalError.message}`);
  }

  const { error: deleteClientError } = await supabase
    .from('ads_data_goal_targetclient')
    .delete()
    .eq('goal_id', editGoalId);

  if (deleteClientError) {
    console.error('기존 클라이언트 삭제 오류:', deleteClientError);
  }

  if (context.selectedClientIds.size > 0) {
    const targetClients = Array.from(context.selectedClientIds).map(
      (clientId) => ({
        goal_id: editGoalId,
        client_id: String(clientId),
      })
    );

    const { error: clientError } = await supabase
      .from('ads_data_goal_targetclient')
      .insert(targetClients);

    if (clientError) {
      console.error('광고주 저장 오류:', clientError);
    }
  }

  if (context.recalculateStartRevenueForEdit) {
    await context.recalculateStartRevenueForEdit(
      editGoalId,
      dates.start_date,
      periodType as 'weekly' | 'monthly',
      calculateWeeklyDates,
      calculateMonthlyDates
    );
  }

  const actionItemInputs = document.querySelectorAll(
    '.action-item-input:not([readonly])'
  );
  const newActionItems: { goal_id: number; action_item: string; status: string }[] = [];

  actionItemInputs.forEach((input) => {
    const text = (input as HTMLInputElement).value.trim();
    if (text) {
      newActionItems.push({
        goal_id: editGoalId,
        action_item: text,
        status: 'progress',
      });
    }
  });

  if (newActionItems.length > 0) {
    const { error: actionError } = await supabase
      .from('ads_data_goal_actionitem')
      .insert(newActionItems);

    if (actionError) {
      console.error('액션 아이템 저장 오류:', actionError);
    }
  }

  cache.goalDetails.delete(editGoalId);
  cache.actionItems.delete(editGoalId);

  const today = formatDate(new Date());
  const cacheKey = `goal_revenue_updated_${today}`;
  const updatedToday = JSON.parse(
    localStorage.getItem(cacheKey) || '[]'
  ) as number[];
  const index = updatedToday.indexOf(editGoalId);
  if (index > -1) {
    updatedToday.splice(index, 1);
    localStorage.setItem(cacheKey, JSON.stringify(updatedToday));
  }
  localStorage.removeItem(`goal_revenue_${editGoalId}_${today}`);

  const { data: updatedGoal, error: fetchError } = await supabase
    .from('ads_data_goal')
    .select(
      'id, manager_id, period_type, start_date, end_date, goal_category, memo, start_revenue, goal_revenue, activate, updated_at'
    )
    .eq('id', editGoalId)
    .single();

  if (fetchError) {
    console.error('수정된 목표 데이터 조회 오류:', fetchError);
  }

  const detailModal = getCachedElementById('goal-detail-modal');
  const isDetailModalOpen =
    detailModal?.classList.contains('active') ?? false;

  if (context.showToast) {
    context.showToast('OBJECTIVE 수정이 완료 되었습니다');
  }

  closeModal(context);
  resetEditMode();

  if (updatedGoal) {
    const goalsWithRevenue = await loadGoalsWithRevenue([
      updatedGoal as Record<string, unknown>,
    ]);
    const updatedGoalWithRevenue =
      goalsWithRevenue?.length > 0
        ? goalsWithRevenue[0]
        : (updatedGoal as Record<string, unknown>);

    const cardElement =
      document.querySelector(`.GoalCard__root[data-goal-id="${editGoalId}"]`);

    if (cardElement) {
      const cardParent = cardElement.parentElement;
      if (cardParent) {
        const newCardElement = createGoalCard(updatedGoalWithRevenue);
        cardParent.replaceChild(newCardElement, cardElement);
      }
    } else {
      if (context.currentManagerTabId && context.loadManagerGoals) {
        await context.loadManagerGoals(context.currentManagerTabId);
      } else if (context.loadAllManagersGoals) {
        await context.loadAllManagersGoals();
      }
    }
    await context.onGoalSaved?.();

    if (isDetailModalOpen) {
      await openGoalDetailModal(updatedGoalWithRevenue);
    }
  }

  return editGoalId;
}

export async function handleCreateMode(params: {
  supabase: SupabaseClient;
  managerId: string;
  periodType: string;
  dates: { start_date: string; end_date: string };
  category: string;
  memo: string;
  startRevenue: string | null;
  goalRevenue: string;
  context: GoalRegisterContext;
}): Promise<string | number> {
  const {
    supabase,
    managerId,
    periodType,
    dates,
    category,
    memo,
    startRevenue,
    goalRevenue,
    context,
  } = params;

  const { data: goalData, error: goalError } = await supabase
    .from('ads_data_goal')
    .insert({
      manager_id: parseInt(managerId, 10),
      period_type: periodType,
      start_date: dates.start_date,
      end_date: dates.end_date,
      goal_category: category,
      memo: memo || null,
      start_revenue: startRevenue ? parseInt(startRevenue, 10) : null,
      goal_revenue: parseInt(goalRevenue, 10),
      activate: true,
    })
    .select()
    .single();

  if (goalError) {
    throw new Error(`목표 저장 오류: ${goalError.message}`);
  }

  const goalId = (goalData as { id: number }).id;

  if (context.selectedClientIds.size > 0) {
    const targetClients = Array.from(context.selectedClientIds).map(
      (clientId) => ({
        goal_id: goalId,
        client_id: String(clientId),
      })
    );

    const { error: clientError } = await supabase
      .from('ads_data_goal_targetclient')
      .insert(targetClients);

    if (clientError) {
      console.error('광고주 저장 오류:', clientError);
    }
  }

  const actionItemInputs = document.querySelectorAll('.action-item-input');
  const actionItems: { goal_id: number; action_item: string; status: string }[] = [];

  actionItemInputs.forEach((input) => {
    const text = (input as HTMLInputElement).value.trim();
    if (text) {
      actionItems.push({
        goal_id: goalId,
        action_item: text,
        status: 'progress',
      });
    }
  });

  if (actionItems.length > 0) {
    const { error: actionError } = await supabase
      .from('ads_data_goal_actionitem')
      .insert(actionItems);

    if (actionError) {
      console.error('액션 아이템 저장 오류:', actionError);
    }
  }

  if (context.showToast) {
    context.showToast('OBJECTIVE 등록 완료');
  }

  closeModal(context);

  if (context.currentManagerTabId && context.loadManagerGoals) {
    await context.loadManagerGoals(context.currentManagerTabId);
  }
  await context.onGoalSaved?.();

  return goalId;
}
