/**
 * 목표 액션 아이템 컴포넌트
 * 액션 아이템 상태 변경 및 메모 관련 함수들을 제공합니다.
 * (Phase 5c: components/goals/action.ts → feature lib)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { cache, ACTION_STATUS_CONFIG, escapeHtml } from '@shared/lib';
import type { ActionItemRow } from '@shared/types';
import type { ActionStatusKey } from '@shared/types';

declare global {
  interface Window {
    supabase?: import('../../../types').SupabaseClient;
    weeklyGoalState?: { lastLoadedGoals: unknown[] | null };
  }
}

export function renderActionItemHTML(item: ActionItemRow, goalId: number): string {
  const status = (item.status ?? 'progress') as ActionStatusKey;
  const config = ACTION_STATUS_CONFIG[status] ?? ACTION_STATUS_CONFIG.progress;
  const memo = item.done_memo ?? '';

  const showMemo = status !== 'progress' && !!memo;

  return `
        <div class="GoalCard__action-item" data-action-item-id="${item.id}" data-status="${status}" data-goal-id="${goalId}">
      <i class="${config.icon} action-item-icon" style="color: ${config.color}; cursor: pointer;"></i>
      <div class="GoalDetailModal__actionContent">
        <span class="GoalDetailModal__actionText">${item.action_item ?? ''}</span>
        ${showMemo ? `<div class="GoalDetailModal__actionMemoDisplay" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;"><i class="ri-sticky-note-line"></i> ${memo}</div>` : ''}
      </div>
    </div>
  `;
}

export async function handleActionItemStatusToggle(
  actionItemId: number,
  currentStatus: string,
  goalId: number
): Promise<void> {
  if (!actionItemId) return;
  const supabase = getSupabaseClientSafe();
  if (!supabase) return;

  let newStatus: ActionStatusKey;
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

    cache.actionItems.delete(goalId);
    cache.goalDetails.delete(goalId);
    if (window.weeklyGoalState?.lastLoadedGoals) window.weeklyGoalState.lastLoadedGoals = null;

    const actionItemElement = document.querySelector(`[data-action-item-id="${actionItemId}"]`);
    actionItemElement?.querySelector('.GoalDetailModal__actionMemoInputWrapper')?.remove();

    const { data: updatedItem, error: fetchError } = await supabase
      .from('ads_data_goal_actionitem')
      .select('status, done_memo')
      .eq('id', actionItemId)
      .single();

    const row = updatedItem as { status?: string; done_memo?: string | null } | null;
    if (!fetchError && row) {
      updateActionItemUI(actionItemId, (row.status as ActionStatusKey) ?? newStatus, row.done_memo ?? null);
    } else {
      updateActionItemUI(actionItemId, newStatus, null);
    }
  } else {
    showActionItemMemoInput(actionItemId, newStatus, goalId);
  }
}

export async function showActionItemMemoInput(
  actionItemId: number,
  newStatus: ActionStatusKey,
  goalId: number,
  targetElement: HTMLElement | null = null
): Promise<void> {
  const actionItemElement =
    targetElement ?? document.querySelector<HTMLElement>(`[data-action-item-id="${actionItemId}"]`);
  if (!actionItemElement) return;

  actionItemElement.querySelector('.GoalDetailModal__actionMemoInputWrapper')?.remove();

  const config = ACTION_STATUS_CONFIG[newStatus] ?? ACTION_STATUS_CONFIG.progress;
  const iconElement = actionItemElement.querySelector<HTMLElement>('.action-item-icon');
  if (iconElement) {
    iconElement.className = `${config.icon} action-item-icon`;
    iconElement.style.color = config.color;
  }
  actionItemElement.setAttribute('data-status', newStatus);

  const supabaseUpdate = getSupabaseClientSafe();
  if (supabaseUpdate) {
    const { error: updateError } = await supabaseUpdate
      .from('ads_data_goal_actionitem')
      .update({ status: newStatus })
      .eq('id', actionItemId);

    if (updateError) {
      console.error('액션 아이템 상태 업데이트 오류:', updateError);
      alert('액션 아이템 상태 변경 중 오류가 발생했습니다.');
      const previousStatus = actionItemElement.getAttribute('data-status') ?? 'progress';
      const prevConfig = ACTION_STATUS_CONFIG[previousStatus as ActionStatusKey] ?? ACTION_STATUS_CONFIG.progress;
      if (iconElement) {
        iconElement.className = `${prevConfig.icon} action-item-icon`;
        iconElement.style.color = prevConfig.color;
      }
      actionItemElement.setAttribute('data-status', previousStatus);
      return;
    }

    cache.actionItems.delete(goalId);
    cache.goalDetails.delete(goalId);
    if (window.weeklyGoalState?.lastLoadedGoals) window.weeklyGoalState.lastLoadedGoals = null;

    const { data: updatedItem, error: fetchError } = await supabaseUpdate
      .from('ads_data_goal_actionitem')
      .select('status')
      .eq('id', actionItemId)
      .single();

    const row = updatedItem as { status?: string } | null;
    if (!fetchError && row?.status) {
      const actualStatus = row.status as ActionStatusKey;
      const actualConfig = ACTION_STATUS_CONFIG[actualStatus] ?? ACTION_STATUS_CONFIG.progress;
      if (iconElement) {
        iconElement.className = `${actualConfig.icon} action-item-icon`;
        iconElement.style.color = actualConfig.color;
      }
      actionItemElement.setAttribute('data-status', actualStatus);
    }
  }

  let existingMemo: string | null = null;
  const supabaseMemo = getSupabaseClientSafe();
  if (supabaseMemo) {
    const { data } = await supabaseMemo
      .from('ads_data_goal_actionitem')
      .select('done_memo')
      .eq('id', actionItemId)
      .single();
    const row = data as { done_memo?: string | null } | null;
    if (row) existingMemo = row.done_memo ?? null;
  }

  const memoInputContainer = document.createElement('div');
  memoInputContainer.className = 'GoalDetailModal__actionMemoInputWrapper';
  memoInputContainer.style.cssText = 'margin-top: 6px; display: flex; gap: 4px; align-items: center;';
  memoInputContainer.addEventListener('click', (e) => e.stopPropagation());

  const memoInput = document.createElement('input');
  memoInput.type = 'text';
  memoInput.className = 'GoalDetailModal__actionMemoInput';
  memoInput.placeholder = '메모를 입력하세요';
  memoInput.value = existingMemo ?? '';
  memoInput.style.cssText =
    'flex: 1; padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px;';
  memoInput.addEventListener('click', (e) => e.stopPropagation());

  const saveButton = document.createElement('button');
  saveButton.textContent = '등록';
  saveButton.className = 'GoalDetailModal__actionMemoSaveBtn';
  saveButton.style.cssText =
    'padding: 4px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;';

  const cancelInput = (): void => {
    memoInputContainer.remove();
    updateActionItemUI(actionItemId, newStatus, existingMemo);
  };

  const saveMemo = async (): Promise<void> => {
    const memoText = memoInput.value.trim();
    const supabase = window.supabase;
    if (!supabase) return;

    const { error } = await supabase
      .from('ads_data_goal_actionitem')
      .update({ done_memo: memoText || null })
      .eq('id', actionItemId);

    if (error) {
      console.error('액션 아이템 메모 저장 오류:', error);
      alert('메모 저장 중 오류가 발생했습니다.');
      return;
    }

    cache.actionItems.delete(goalId);
    cache.goalDetails.delete(goalId);
    if (window.weeklyGoalState?.lastLoadedGoals) window.weeklyGoalState.lastLoadedGoals = null;

    document.querySelectorAll('.GoalDetailModal__actionMemoInputWrapper').forEach((container) => {
      if (container.closest(`[data-action-item-id="${actionItemId}"]`)) container.remove();
    });

    setTimeout(async () => {
      const { data: updatedItem, error: fetchError } = await supabase
        .from('ads_data_goal_actionitem')
        .select('status, done_memo')
        .eq('id', actionItemId)
        .single();
      const row = updatedItem as { status?: string; done_memo?: string | null } | null;
      if (!fetchError && row) {
        updateActionItemUI(
          actionItemId,
          (row.status as ActionStatusKey) ?? newStatus,
          row.done_memo ?? null
        );
      } else {
        updateActionItemUI(actionItemId, newStatus, memoText || null);
      }
    }, 100);
  };

  saveButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveMemo();
  });
  memoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      saveMemo();
    }
  });
  memoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelInput();
    }
  });

  setTimeout(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        !memoInputContainer.contains(target) &&
        iconElement &&
        !iconElement.contains(target)
      ) {
        cancelInput();
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    document.addEventListener('click', handleOutsideClick);
  }, 100);

  memoInputContainer.appendChild(memoInput);
  memoInputContainer.appendChild(saveButton);

  const contentWrapper = actionItemElement.querySelector('.GoalDetailModal__actionContent');
  if (contentWrapper) contentWrapper.appendChild(memoInputContainer);
  else actionItemElement.appendChild(memoInputContainer);

  setTimeout(() => memoInput.focus(), 0);
  if (existingMemo) memoInput.select();
}

export function updateActionItemUI(
  actionItemId: number,
  newStatus: ActionStatusKey,
  doneMemo: string | null
): void {
  const actionItemElements = document.querySelectorAll<HTMLElement>(
    `[data-action-item-id="${actionItemId}"]`
  );
  if (!actionItemElements?.length) return;

  const config = ACTION_STATUS_CONFIG[newStatus] ?? ACTION_STATUS_CONFIG.progress;

  actionItemElements.forEach((actionItemElement) => {
    actionItemElement.setAttribute('data-status', newStatus);

    let iconElement = actionItemElement.querySelector<HTMLElement>('.action-item-icon');
    if (!iconElement) {
      const contentWrapper = actionItemElement.querySelector('.GoalDetailModal__actionContent');
      const prevSibling = contentWrapper?.previousElementSibling;
      if (prevSibling?.tagName === 'I') iconElement = prevSibling as HTMLElement;
      else if (prevSibling) iconElement = prevSibling.querySelector('i');
    }
    if (!iconElement) iconElement = actionItemElement.querySelector('i');

    if (iconElement) {
      iconElement.className = `${config.icon} action-item-icon`;
      iconElement.style.color = config.color;
      if (!iconElement.style.cursor) iconElement.style.cursor = 'pointer';
    }

    const actionContent = actionItemElement.querySelector('.GoalDetailModal__actionContent');
    if (actionContent) {
      const existingMemoDisplay = actionContent.querySelector('.GoalDetailModal__actionMemoDisplay');
      if (newStatus === 'progress') {
        existingMemoDisplay?.remove();
      } else {
        if (doneMemo) {
          if (existingMemoDisplay) {
            existingMemoDisplay.innerHTML = `<i class="ri-sticky-note-line"></i> ${escapeHtml(doneMemo)}`;
          } else {
            const memoDisplay = document.createElement('div');
            memoDisplay.className = 'GoalDetailModal__actionMemoDisplay';
            memoDisplay.style.cssText =
              'font-size: 11px; color: var(--text-muted); margin-top: 4px;';
            memoDisplay.innerHTML = `<i class="ri-sticky-note-line"></i> ${escapeHtml(doneMemo)}`;
            actionContent.appendChild(memoDisplay);
          }
        } else {
          existingMemoDisplay?.remove();
        }
      }
    }
  });
}
