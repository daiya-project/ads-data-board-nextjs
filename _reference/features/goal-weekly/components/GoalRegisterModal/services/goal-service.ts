/**
 * 목표 등록/수정 DB 서비스
 */

import { getSupabaseClientSafe } from '@shared/api';

export interface GoalInsertData {
  managerId: number;
  periodType: string;
  startDate: string;
  endDate: string;
  category: string;
  memo: string | null;
  startRevenue: number | null;
  goalRevenue: number;
}

export interface GoalUpdateData {
  category: string;
  memo: string | null;
  goalRevenue: number;
}

export async function createGoal(goalData: GoalInsertData): Promise<string | null> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }

  const { data, error } = await supabase
    .from('ads_data_goal')
    .insert({
      manager_id: goalData.managerId,
      period_type: goalData.periodType,
      start_date: goalData.startDate,
      end_date: goalData.endDate,
      goal_category: goalData.category,
      memo: goalData.memo || null,
      start_revenue: goalData.startRevenue ? parseInt(String(goalData.startRevenue), 10) : null,
      goal_revenue: parseInt(String(goalData.goalRevenue), 10),
      activate: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`목표 생성 오류: ${error.message}`);
  }

  const id = data ? (data as { id: string | number }).id : null;
  return id != null ? String(id) : null;
}

export async function updateGoal(goalId: string, goalData: GoalUpdateData): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }

  const { error } = await supabase
    .from('ads_data_goal')
    .update({
      goal_category: goalData.category,
      memo: goalData.memo || null,
      goal_revenue: parseInt(String(goalData.goalRevenue), 10),
      activate: true,
    })
    .eq('id', goalId);

  if (error) {
    throw new Error(`목표 수정 오류: ${error.message}`);
  }
}

export async function deleteGoalTargetClients(goalId: string): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  const { error } = await supabase
    .from('ads_data_goal_targetclient')
    .delete()
    .eq('goal_id', goalId);

  if (error) {
    console.error('기존 클라이언트 삭제 오류:', error);
  }
}

export async function addGoalTargetClients(
  goalId: string,
  clientIds: string[]
): Promise<void> {
  if (!clientIds || clientIds.length === 0) return;

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }

  const targetClients = clientIds.map((clientId) => ({
    goal_id: goalId,
    client_id: clientId,
  }));

  const { error } = await supabase
    .from('ads_data_goal_targetclient')
    .insert(targetClients);

  if (error) {
    throw new Error(`타겟 광고주 저장 오류: ${error.message}`);
  }
}
