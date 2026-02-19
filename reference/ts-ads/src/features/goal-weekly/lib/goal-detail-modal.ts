/**
 * 목표 상세/요약 모달 - 공개 API
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, cache, isCacheValid, devLog, showToast, escapeHtml } from '@shared/lib';
import { refreshWeekNavigation } from '../components/WeekNavigation/WeekNavigation';
import type { GoalWithRevenue } from '@shared/types';
import type { OpenGoalDetailModalOptions } from './goal-detail-modal-types';
import type { CachedGoalDetail } from './goal-detail-modal-types';
import { renderGoalDetailModalContent, fetchAndRenderGoalDetailContent } from './goal-detail-modal-content';
import { setupModalCloseEvents, setupModalEditButton, handleModalActionItemToggle, loadActionItemsForCard } from './goal-detail-modal-events';

export { openSummaryDetailModal, toggleSummarySection } from './goal-summary-modal';
export type { OpenGoalDetailModalOptions } from './goal-detail-modal-types';

/**
 * 목표 상세 모달 열기
 */
export async function openGoalDetailModal(
  goal: GoalWithRevenue,
  sourceCard: HTMLElement | null = null,
  options?: OpenGoalDetailModalOptions
): Promise<void> {
  const modal = document.getElementById('goal-detail-modal') as HTMLElement | null;
  const detailBody = document.getElementById('goal-detail-body') as HTMLElement | null;
  if (!modal || !detailBody) return;

  const closeModalAndRefresh = async (): Promise<void> => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    try {
      const container = document.getElementById('manager-content-area');
      const managerId = (window as { weeklyGoalState?: { currentManagerTabId?: number } }).weeklyGoalState?.currentManagerTabId ?? null;
      await refreshWeekNavigation(container, managerId);
    } catch (err) {
      console.error('카드 리프레시 오류:', err);
    }
  };

  let source = sourceCard;
  if (!source) {
    source = document.querySelector(`.GoalCard__root[data-goal-id="${goal.id}"]`) as HTMLElement | null;
  }

  if (source) {
    const clonedCard = source.cloneNode(true) as HTMLElement;
    clonedCard.classList.add('GoalCard__root--currentWeek');

    const body = clonedCard.querySelector('.GoalCard__body');
    if (body) {
      (body as HTMLElement).style.flexDirection = 'row';
      (body as HTMLElement).style.display = 'flex';
    }
    clonedCard.querySelector('.GoalCard__description--compact')?.classList.remove('GoalCard__description--compact');
    clonedCard.querySelector('.GoalCard__objective--compact')?.classList.remove('GoalCard__objective--compact');

    const bodyLeft = clonedCard.querySelector('.GoalCard__body-left');
    let bodyRight = clonedCard.querySelector('.GoalCard__body-right');
    if (bodyLeft) {
      (bodyLeft as HTMLElement).style.flex = '1';
      (bodyLeft as HTMLElement).style.minWidth = '0';
    }
    if (!bodyRight && body) {
      bodyRight = document.createElement('div');
      bodyRight.className = 'GoalCard__body-right';
      (bodyRight as HTMLElement).style.flex = '1';
      (bodyRight as HTMLElement).style.minWidth = '0';
      bodyRight.innerHTML = `
        <div class="GoalCard__actions">
          <div class="GoalCard__section-title">
            <i class="ri-list-check-2"></i>
            <span>액션 아이템</span>
          </div>
          <div class="GoalCard__actions-list" data-actions-container>
            <div class="GoalCard__empty-state">로딩 중...</div>
          </div>
        </div>
      `;
      body.appendChild(bodyRight);
    } else if (bodyRight) {
      (bodyRight as HTMLElement).style.flex = '1';
      (bodyRight as HTMLElement).style.minWidth = '0';
    }

    detailBody.innerHTML = '';
    detailBody.appendChild(clonedCard);

    clonedCard.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;
      const icon = target.closest('.action-item-icon');
      if (!icon) return;
      e.preventDefault();
      e.stopPropagation();
      const actionItem = icon.closest('.GoalCard__action-item');
      if (actionItem) {
        const actionId = actionItem.getAttribute('data-action-item-id');
        const currentStatus = actionItem.getAttribute('data-status') ?? 'progress';
        const goalId = clonedCard.getAttribute('data-goal-id');
        if (actionId && goalId) {
          await handleModalActionItemToggle(
            parseInt(actionId, 10),
            currentStatus,
            parseInt(goalId, 10),
            actionItem as HTMLElement
          );
        }
      }
    });

    setupModalCloseEvents(modal, closeModalAndRefresh);
    setupModalEditButton(modal, goal);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const actionsContainer =
      clonedCard.querySelector('[data-actions-container]') ??
      clonedCard.querySelector('.GoalCard__actions-list');
    if (actionsContainer && goal.id) {
      loadActionItemsForCard(goal.id, actionsContainer as HTMLElement);
    }
    return;
  }

  const cachedDetail = cache.goalDetails.get(goal.id);
  if (cachedDetail && isCacheValid(cachedDetail, cache.goalDetailTtl)) {
    const cached = cachedDetail.data as CachedGoalDetail;
    renderGoalDetailModalContent(cached, modal, detailBody);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupModalCloseEvents(modal, closeModalAndRefresh);
    setupModalEditButton(modal, cached.goal as GoalWithRevenue);
    return;
  }

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    detailBody.innerHTML = '<p class="empty-state">데이터를 불러올 수 없습니다. 연결을 확인해주세요.</p>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupModalCloseEvents(modal, closeModalAndRefresh);
    return;
  }

  detailBody.innerHTML = '<p class="empty-state">데이터를 불러오는 중...</p>';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  try {
    await fetchAndRenderGoalDetailContent(goal, detailBody, options);
    setupModalCloseEvents(modal, closeModalAndRefresh);
    setupModalEditButton(modal, goal);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'RACE_ABORT') return;
    devLog('목표 상세 데이터 로드 오류:', err);
    showToast('목표 상세 로드에 실패했습니다');
    detailBody.innerHTML = `<p class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.<br><small>${escapeHtml(msg)}</small></p>`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupModalCloseEvents(modal, closeModalAndRefresh);
  }
}

/**
 * 목표 상세 모달 닫기
 */
export function closeGoalDetailModal(): void {
  const modal = getCachedElementById('goal-detail-modal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}
