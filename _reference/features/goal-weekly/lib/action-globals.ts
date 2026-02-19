/**
 * 전역 액션 아이템 함수 모듈 (Phase 5c: components/goals/action-globals.ts → feature lib)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, cache, devLog } from '@shared/lib';
import { updateActionItemUI } from './action';
import type { ActionStatusKey } from '@shared/types';

declare global {
  interface Window {
    supabase?: import('../../../types').SupabaseClient;
    toggleActionItemStatus?: (actionItemId: string, currentStatus: string) => Promise<void>;
    saveActionMemo?: (actionItemId: string) => Promise<void>;
  }
}

const statusConfigMap: Record<string, { icon: string; color: string }> = {
  'progress': { icon: 'ri-loader-4-line', color: '#3b82f6' },
  'done': { icon: 'ri-check-line', color: '#10b981' },
  'failed': { icon: 'ri-close-line', color: '#ef4444' }
};

async function toggleActionItemStatus(actionItemId: string, currentStatus: string): Promise<void> {
  if (!window.supabase) return;

  const supabase = window.supabase;
  const itemElement = getCachedElementById(`action-item-${actionItemId}`);
  const memoWrapper = getCachedElementById(`memo-wrapper-${actionItemId}`);

  const actualCurrentStatus = itemElement ? itemElement.getAttribute('data-status') || 'progress' : (currentStatus || 'progress');

  let nextStatus: ActionStatusKey = 'progress';
  if (actualCurrentStatus === 'progress' || !actualCurrentStatus) {
    nextStatus = 'done';
  } else if (actualCurrentStatus === 'done') {
    nextStatus = 'failed';
  } else if (actualCurrentStatus === 'failed') {
    nextStatus = 'progress';
  }

  if (nextStatus === 'progress') {
    try {
      const { data: actionItem } = await supabase
        .from('ads_data_goal_actionitem')
        .select('goal_id')
        .eq('id', actionItemId)
        .single();

      const { error } = await supabase
        .from('ads_data_goal_actionitem')
        .update({ status: 'progress', done_memo: null })
        .eq('id', actionItemId);

      if (error) throw error;

      const row = actionItem as { goal_id?: number } | null;
      if (row?.goal_id) {
        cache.actionItems.delete(row.goal_id);
        cache.goalDetails.delete(row.goal_id);
      }

      updateActionItemUI(parseInt(actionItemId), 'progress', null);

      if (memoWrapper) {
        memoWrapper.style.display = 'none';
        const memoInput = document.getElementById(`memo-input-${actionItemId}`) as HTMLInputElement | null;
        if (memoInput) memoInput.value = '';
      }

      const itemEl = document.getElementById(`action-item-${actionItemId}`);
      if (itemEl) {
        const actionContent = itemEl.querySelector('.GoalDetailModal__actionContent');
        if (actionContent) {
          const existingMemo = actionContent.querySelector('.GoalDetailModal__actionMemoDisplay');
          if (existingMemo) {
            existingMemo.remove();
          }
        }
      }
    } catch (error) {
      devLog('액션 아이템 상태 업데이트 오류:', error);
      alert('상태 업데이트에 실패했습니다.');
    }
    return;
  }

  const nextConfig = statusConfigMap[nextStatus] || statusConfigMap['progress'];

  if (itemElement) {
    const pillIcon = itemElement.querySelector('.GoalDetailModal__actionPillIcon') as HTMLElement | null;
    if (pillIcon) {
      pillIcon.innerHTML = `<i class="${nextConfig.icon}"></i>`;
      pillIcon.style.color = nextConfig.color;
      itemElement.setAttribute('data-status', nextStatus);
    }
  }

  if (memoWrapper) {
    memoWrapper.style.display = 'block';
    const memoInput = document.getElementById(`memo-input-${actionItemId}`) as HTMLInputElement | null;
    if (memoInput) {
      if (itemElement) {
        const existingMemo = itemElement.querySelector('.GoalDetailModal__actionMemoDisplay');
        if (existingMemo && actualCurrentStatus === 'done') {
          const memoText = existingMemo.textContent?.trim().replace('📝', '').trim() ?? '';
          memoInput.value = memoText;
        } else {
          memoInput.value = '';
        }
      } else {
        memoInput.value = '';
      }
      memoInput.focus();
      memoInput.placeholder = '액션 아이템에 관한 코멘트를 입력하세요';
    }
    (memoWrapper as HTMLElement & { dataset: DOMStringMap }).dataset.nextStatus = nextStatus;
  }
}

async function saveActionMemo(actionItemId: string): Promise<void> {
  if (!window.supabase) return;

  const supabase = window.supabase;
  const memoWrapper = document.getElementById(`memo-wrapper-${actionItemId}`) as HTMLElement | null;
  const memoInput = document.getElementById(`memo-input-${actionItemId}`) as HTMLInputElement | null;

  if (!memoWrapper || !memoInput) return;

  const memo = memoInput.value.trim();
  const nextStatus = memoWrapper.dataset.nextStatus as ActionStatusKey | undefined;

  if (!nextStatus) return;

  try {
    const updateData: { status: string; done_memo?: string } = { status: nextStatus };
    if (memo) {
      updateData.done_memo = memo;
    }

    const { data: actionItem } = await supabase
      .from('ads_data_goal_actionitem')
      .select('goal_id')
      .eq('id', actionItemId)
      .single();

    const { error } = await supabase
      .from('ads_data_goal_actionitem')
      .update(updateData)
      .eq('id', actionItemId);

    if (error) throw error;

    const row = actionItem as { goal_id?: number } | null;
    if (row?.goal_id) {
      cache.actionItems.delete(row.goal_id);
      cache.goalDetails.delete(row.goal_id);
    }

    updateActionItemUI(parseInt(actionItemId), nextStatus, memo || null);

    memoWrapper.style.display = 'none';
    memoInput.value = '';
    delete memoWrapper.dataset.nextStatus;
  } catch (error) {
    devLog('액션 아이템 메모 저장 오류:', error);
    alert('메모 저장에 실패했습니다.');
  }
}

export function setupActionGlobals(): void {
  window.supabase = getSupabaseClientSafe() ?? undefined;
  window.toggleActionItemStatus = toggleActionItemStatus;
  window.saveActionMemo = saveActionMemo;
}

export { toggleActionItemStatus, saveActionMemo };
