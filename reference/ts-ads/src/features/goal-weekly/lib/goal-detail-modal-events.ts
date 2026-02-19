/**
 * Goal Detail Modal - 이벤트 핸들러
 */

import { getSupabaseClientSafe } from '@shared/api';
import type { GoalWithRevenue, GoalBase } from '@shared/types';
import type { ActionItemRow } from '@shared/types';
import {
  renderActionItemHTML,
  handleActionItemStatusToggle,
  showActionItemMemoInput,
  updateActionItemUI,
} from './action';
import { openGoalEditModal, openGoalCloneModal } from '../components/GoalRegisterModal';

declare global {
  interface Window {
    goalRegisterContext?: unknown;
    createGoalRegisterContext?: () => unknown;
  }
}

/**
 * 모달 닫기 이벤트 설정
 * @param modal 모달 엘리먼트
 * @param onClose 닫을 때 실행할 비동기 함수 (리프레시 등)
 */
export function setupModalCloseEvents(
  modal: HTMLElement,
  onClose: () => Promise<void>
): void {
  const closeBtn = modal.querySelector('.Modal__closeBtn');
  if (closeBtn) (closeBtn as HTMLElement).onclick = () => onClose();
  modal.onclick = (e: Event) => {
    if (e.target === modal) onClose();
  };
}

/**
 * 수정/복제 버튼 이벤트 설정
 */
export function setupModalEditButton(
  modal: HTMLElement,
  goal: GoalWithRevenue
): void {
  const editBtn = modal.querySelector('.Modal__editBtn');
  if (editBtn) {
    (editBtn as HTMLElement).onclick = async () => {
      if (!window.goalRegisterContext && window.createGoalRegisterContext) {
        window.goalRegisterContext = window.createGoalRegisterContext();
      }
      if (window.goalRegisterContext) {
        (openGoalEditModal as (g: GoalBase, ctx: unknown) => void)(goal, window.goalRegisterContext);
      }
    };
  }

  let cloneBtn = modal.querySelector('.Modal__cloneBtn') as HTMLElement | null;
  if (!cloneBtn) {
    const headerActions = modal.querySelector('.Modal__headerActions');
    const closeBtn = modal.querySelector('.Modal__closeBtn');
    if (headerActions) {
      cloneBtn = document.createElement('button');
      cloneBtn.className = 'Modal__cloneBtn';
      cloneBtn.id = 'clone-goal-detail-btn';
      cloneBtn.title = '다음 주로 복제';
      cloneBtn.innerHTML = '<i class="ri-file-copy-line"></i>';
      if (closeBtn) {
        headerActions.insertBefore(cloneBtn, closeBtn);
      } else {
        headerActions.appendChild(cloneBtn);
      }
    }
  }
  if (cloneBtn) {
    cloneBtn.onclick = async () => {
      if (!window.goalRegisterContext && window.createGoalRegisterContext) {
        window.goalRegisterContext = window.createGoalRegisterContext();
      }
      if (window.goalRegisterContext) {
        (openGoalCloneModal as (g: GoalBase, ctx: unknown) => void)(goal, window.goalRegisterContext);
      }
    };
  }
}

/**
 * 액션 아이템 토글 핸들러 (모달 내 클릭)
 */
export async function handleModalActionItemToggle(
  actionItemId: number,
  currentStatus: string,
  goalId: number,
  actionItemElement: HTMLElement
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase || !actionItemElement) return;

  let newStatus: 'progress' | 'done' | 'failed';
  if (currentStatus === 'progress') newStatus = 'done';
  else if (currentStatus === 'done') newStatus = 'failed';
  else newStatus = 'progress';

  if (newStatus === 'progress') {
    const { error } = await supabase
      .from('ads_data_goal_actionitem')
      .update({ status: newStatus })
      .eq('id', actionItemId);
    if (error) {
      console.error('액션 아이템 상태 업데이트 오류:', error);
      alert('액션 아이템 상태 변경 중 오류가 발생했습니다.');
      return;
    }
    actionItemElement.querySelector('.GoalDetailModal__actionMemoInputWrapper')?.remove();
    const { data: updatedItem } = await supabase
      .from('ads_data_goal_actionitem')
      .select('status, done_memo')
      .eq('id', actionItemId)
      .single();
    const row = updatedItem as { status?: string; done_memo?: string | null } | null;
    if (row) {
      updateActionItemUI(
        actionItemId,
        (row.status as 'progress' | 'done' | 'failed') ?? newStatus,
        row.done_memo ?? null
      );
    }
  } else {
    await showActionItemMemoInput(
      actionItemId,
      newStatus,
      goalId,
      actionItemElement
    );
  }
}

/**
 * 카드에 대한 액션 아이템 로드 후 컨테이너에 렌더링
 */
export async function loadActionItemsForCard(
  goalId: number,
  actionsContainer: HTMLElement
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    actionsContainer.innerHTML =
      '<div class="GoalCard__empty-state">데이터를 불러올 수 없습니다</div>';
    return;
  }
  try {
    const { data: actionItems, error } = await supabase
      .from('ads_data_goal_actionitem')
      .select('id, action_item, status, done_memo')
      .eq('goal_id', goalId)
      .order('id', { ascending: true });

    if (error) {
      actionsContainer.innerHTML =
        '<div class="GoalCard__empty-state">액션 아이템 없음</div>';
      return;
    }
    const items = (actionItems ?? []) as ActionItemRow[];
    if (items.length === 0) {
      actionsContainer.innerHTML =
        '<div class="GoalCard__empty-state">액션 아이템 없음</div>';
      return;
    }
    actionsContainer.innerHTML = items
      .map((item) => renderActionItemHTML(item, goalId))
      .join('');
  } catch (err) {
    console.error('액션 아이템 로드 오류:', err);
    actionsContainer.innerHTML = '<div class="GoalCard__empty-state">오류 발생</div>';
  }
}
