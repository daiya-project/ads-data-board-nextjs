/**
 * 액션 아이템 DB 서비스
 */

import { getSupabaseClientSafe } from '@shared/api';
import type { ActionItemRow } from '@shared/types';

export async function addActionItems(
  goalId: string,
  actionItems: string[]
): Promise<void> {
  if (!actionItems || actionItems.length === 0) return;

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }

  const actionItemRecords = actionItems
    .filter((item) => item.trim())
    .map((item) => ({
      goal_id: goalId,
      action_item: item.trim(),
      status: 'progress',
    }));

  if (actionItemRecords.length > 0) {
    const { error } = await supabase
      .from('ads_data_goal_actionitem')
      .insert(actionItemRecords);

    if (error) {
      console.error('액션 아이템 저장 오류:', error);
      throw new Error(`액션 아이템 저장 오류: ${error.message}`);
    }
  }
}

export async function getActionItemsByGoalId(
  goalId: number
): Promise<ActionItemRow[]> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  }

  const { data, error } = await supabase
    .from('ads_data_goal_actionitem')
    .select('id, action_item, status, done_memo')
    .eq('goal_id', goalId)
    .order('id', { ascending: true });

  if (error) {
    console.error('액션 아이템 조회 오류:', error);
    return [];
  }

  return (data as ActionItemRow[]) || [];
}
