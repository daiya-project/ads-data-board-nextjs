/**
 * Goal Weekly Feature — 주간 목표 복제 모달
 */

import { getSupabaseClientSafe } from '@shared/api';
import { CATEGORY_LABELS, formatNumberWithCommas, formatDate, showToast } from '@shared/lib';
import { getWeekData } from './navigation-state';
import { getWeekBoundsForOffset } from '../../lib/week-utils';
import type { GoalWithRevenue, SupabaseClient } from '@shared/types';

interface CloneOptions {
  includeClients: boolean;
  includeActionItems: boolean;
  keepGoalRevenue: boolean;
}

export async function openWeekCloneModal(
  sourceOffset: number,
  managerId: number
): Promise<void> {
  const weekData = getWeekData(sourceOffset);
  if (!weekData || !weekData.goals || weekData.goals.length === 0) {
    showToast('복제할 목표가 없습니다');
    return;
  }

  const existing = document.querySelector('.week-clone-modal');
  if (existing) existing.remove();

  const modal = createModalElement(weekData.goals, sourceOffset);
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  setupModalEvents(modal, weekData.goals, sourceOffset, managerId);
}

function createModalElement(goals: GoalWithRevenue[], sourceOffset: number): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'week-clone-modal';

  const sourceBounds = getWeekBoundsForOffset(sourceOffset);
  const sourceLabel = `${formatDateShort(sourceBounds.start_date)} ~ ${formatDateShort(sourceBounds.end_date)}`;

  const targetOffset = sourceOffset + 1;
  const targetBoundsDisplay = getWeekBoundsForOffset(targetOffset);
  const targetLabel = `${formatDateShort(targetBoundsDisplay.start_date)} ~ ${formatDateShort(targetBoundsDisplay.end_date)} / 다음 주`;

  const goalCheckboxes = goals.map((goal, idx) => {
    const category = (goal.goal_category as string) || 'etc';
    const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
    const memo = goal.memo || '(메모 없음)';
    const goalRevenue = goal.goal_revenue ? `${formatNumberWithCommas(goal.goal_revenue)}원` : '-';
    return `
      <label class="week-clone-modal__goal-item" data-goal-id="${goal.id}">
        <input type="checkbox" class="week-clone-modal__goal-check" data-index="${idx}" checked />
        <span class="goal-category-badge goal-category-${category}" style="font-size:11px;">${categoryLabel}</span>
        <span class="week-clone-modal__goal-memo">${escapeHtml(memo)}</span>
        <span class="week-clone-modal__goal-revenue">${goalRevenue}</span>
      </label>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="week-clone-modal__overlay"></div>
    <div class="week-clone-modal__container">
      <div class="week-clone-modal__header">
        <h2 class="week-clone-modal__title">
          <i class="ri-file-copy-line"></i> 목표 복제
        </h2>
        <button class="week-clone-modal__close-btn">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div class="week-clone-modal__body">
        <div class="week-clone-modal__info-row">
          <span class="week-clone-modal__info-label">원본</span>
          <span class="week-clone-modal__info-value">${sourceLabel}</span>
        </div>
        <div class="week-clone-modal__info-row">
          <span class="week-clone-modal__info-label">대상</span>
          <span class="week-clone-modal__info-value">${targetLabel}</span>
          <input type="hidden" class="week-clone-modal__target-select" value="${targetOffset}" />
        </div>

        <div class="week-clone-modal__divider"></div>

        <div class="week-clone-modal__section-title">
          복제할 목표 선택
          <button class="week-clone-modal__select-all-btn">전체 선택/해제</button>
        </div>
        <div class="week-clone-modal__goal-list">
          ${goalCheckboxes}
        </div>

        <div class="week-clone-modal__divider"></div>

        <div class="week-clone-modal__section-title">옵션</div>
        <div class="week-clone-modal__options">
          <label class="week-clone-modal__option">
            <input type="checkbox" id="clone-opt-clients" checked />
            <span>광고주(타겟 클라이언트) 포함</span>
          </label>
          <label class="week-clone-modal__option">
            <input type="checkbox" id="clone-opt-revenue" />
            <span>목표 매출 동일하게 유지</span>
          </label>
          <label class="week-clone-modal__option">
            <input type="checkbox" id="clone-opt-actions" />
            <span>액션 아이템 포함 <small>(상태 초기화)</small></span>
          </label>
        </div>
      </div>
      <div class="week-clone-modal__footer">
        <button class="week-clone-modal__cancel-btn">취소</button>
        <button class="week-clone-modal__submit-btn">
          <i class="ri-file-copy-line"></i> 복제하기
        </button>
      </div>
    </div>
  `;

  return modal;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setupModalEvents(
  modal: HTMLElement,
  goals: GoalWithRevenue[],
  sourceOffset: number,
  managerId: number
): void {
  const closeBtn = modal.querySelector('.week-clone-modal__close-btn');
  const overlay = modal.querySelector('.week-clone-modal__overlay');
  const cancelBtn = modal.querySelector('.week-clone-modal__cancel-btn');
  const submitBtn = modal.querySelector('.week-clone-modal__submit-btn');
  const selectAllBtn = modal.querySelector('.week-clone-modal__select-all-btn');

  const closeModal = () => {
    modal.style.display = 'none';
    setTimeout(() => modal.remove(), 200);
  };

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  selectAllBtn?.addEventListener('click', () => {
    const checkboxes = modal.querySelectorAll('.week-clone-modal__goal-check') as NodeListOf<HTMLInputElement>;
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
    checkboxes.forEach((cb) => (cb.checked = !allChecked));
  });

  submitBtn?.addEventListener('click', async () => {
    const checkboxes = modal.querySelectorAll('.week-clone-modal__goal-check') as NodeListOf<HTMLInputElement>;
    const selectedIndices = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => parseInt(cb.getAttribute('data-index') ?? '-1', 10))
      .filter((i) => i >= 0);

    if (selectedIndices.length === 0) {
      showToast('복제할 목표를 선택해주세요');
      return;
    }

    const targetSelect = modal.querySelector('.week-clone-modal__target-select') as HTMLInputElement;
    const targetOffset = parseInt(targetSelect.value, 10);
    const targetBounds = getWeekBoundsForOffset(targetOffset);

    const options: CloneOptions = {
      includeClients: (modal.querySelector('#clone-opt-clients') as HTMLInputElement)?.checked ?? true,
      includeActionItems: (modal.querySelector('#clone-opt-actions') as HTMLInputElement)?.checked ?? false,
      keepGoalRevenue: (modal.querySelector('#clone-opt-revenue') as HTMLInputElement)?.checked ?? true,
    };

    const selectedGoals = selectedIndices.map((i) => goals[i]).filter(Boolean);

    (submitBtn as HTMLButtonElement).disabled = true;
    (submitBtn as HTMLButtonElement).textContent = '복제 중...';

    try {
      await executeClone(selectedGoals, managerId, targetBounds, options);
      showToast(`${selectedGoals.length}개 목표가 복제되었습니다`);
      closeModal();

      window.dispatchEvent(new CustomEvent('week-goals-cloned', {
        detail: { managerId, targetOffset },
      }));
    } catch (err) {
      console.error('[weekClone] 복제 오류:', err);
      showToast('복제 중 오류가 발생했습니다');
      (submitBtn as HTMLButtonElement).disabled = false;
      (submitBtn as HTMLButtonElement).innerHTML = '<i class="ri-file-copy-line"></i> 복제하기';
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

async function executeClone(
  goals: GoalWithRevenue[],
  managerId: number,
  targetBounds: { start_date: string; end_date: string },
  options: CloneOptions
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) throw new Error('Supabase 클라이언트 미초기화');

  for (const goal of goals) {
    await cloneSingleGoal(supabase, goal, managerId, targetBounds, options);
  }
}

async function cloneSingleGoal(
  supabase: SupabaseClient,
  goal: GoalWithRevenue,
  managerId: number,
  targetBounds: { start_date: string; end_date: string },
  options: CloneOptions
): Promise<void> {
  const insertData: Record<string, unknown> = {
    manager_id: managerId,
    period_type: 'weekly',
    start_date: targetBounds.start_date,
    end_date: targetBounds.end_date,
    goal_category: goal.goal_category || 'etc',
    memo: goal.memo || null,
    goal_revenue: options.keepGoalRevenue ? (goal.goal_revenue ?? 0) : 0,
    start_revenue: 0,
    activate: true,
  };

  const goalResult = await supabase
    .from('ads_data_goal')
    .insert(insertData)
    .select('id')
    .single() as unknown as { data: { id: number } | null; error: { message: string } | null };

  if (goalResult.error || !goalResult.data) {
    throw new Error(`목표 복제 오류: ${goalResult.error?.message ?? 'unknown'}`);
  }

  const newGoalId = goalResult.data.id;

  let clientIds: string[] = [];
  if (options.includeClients) {
    const clientResult = await (supabase
      .from('ads_data_goal_targetclient')
      .select('client_id')
      .eq('goal_id', goal.id) as unknown as Promise<{ data: { client_id: string }[] | null }>);

    if (clientResult.data && clientResult.data.length > 0) {
      clientIds = clientResult.data.map((tc) => String(tc.client_id));
      const newClients = clientIds.map((cid) => ({
        goal_id: newGoalId,
        client_id: cid,
      }));
      const insertResult = await (supabase
        .from('ads_data_goal_targetclient')
        .insert(newClients) as unknown as Promise<{ error: unknown }>);
      if (insertResult.error) {
        console.error('[weekClone] 클라이언트 복제 오류:', insertResult.error);
      }
    }
  }

  if (options.includeActionItems) {
    const actionResult = await (supabase
      .from('ads_data_goal_actionitem')
      .select('action_item')
      .eq('goal_id', goal.id) as unknown as Promise<{ data: { action_item: string }[] | null }>);

    if (actionResult.data && actionResult.data.length > 0) {
      const newActions = actionResult.data.map((ai) => ({
        goal_id: newGoalId,
        action_item: ai.action_item,
        status: 'progress',
      }));
      const insertResult = await (supabase
        .from('ads_data_goal_actionitem')
        .insert(newActions) as unknown as Promise<{ error: unknown }>);
      if (insertResult.error) {
        console.error('[weekClone] 액션 아이템 복제 오류:', insertResult.error);
      }
    }
  }

  if (clientIds.length > 0) {
    await recalculateClonedStartRevenue(supabase, newGoalId, targetBounds.start_date, clientIds);
  }
}

async function recalculateClonedStartRevenue(
  supabase: SupabaseClient,
  goalId: number,
  targetStartDate: string,
  clientIds: string[]
): Promise<void> {
  try {
    const targetStart = new Date(targetStartDate);
    const prevWeekStart = new Date(targetStart);
    prevWeekStart.setDate(targetStart.getDate() - 7);
    const prevWeekEnd = new Date(targetStart);
    prevWeekEnd.setDate(targetStart.getDate() - 1);

    const startStr = formatDate(prevWeekStart);
    const endStr = formatDate(prevWeekEnd);

    const dailyQuery = supabase
      .from('ads_data_daily')
      .select('amount')
      .in('client_id', clientIds);
    const dailyResult = await ((dailyQuery.gte!('date', startStr).lte!('date', endStr)) as unknown as Promise<{ data: { amount: number }[] | null; error: unknown }>);

    if (dailyResult.error) {
      console.error('[weekClone] start_revenue 계산 오류:', dailyResult.error);
      return;
    }

    const totalRevenue = dailyResult.data?.reduce(
      (sum, r) => sum + (r.amount ?? 0),
      0
    ) ?? 0;

    await (supabase
      .from('ads_data_goal')
      .update({ start_revenue: totalRevenue })
      .eq('id', goalId) as unknown as Promise<{ error: unknown }>);
  } catch (err) {
    console.error('[weekClone] start_revenue 재계산 예외:', err);
  }
}
