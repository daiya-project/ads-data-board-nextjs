/**
 * 목표 수정 모달 열기
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, formatDate, formatNumberWithCommas } from '@shared/lib';
import { setEditModeState } from '../state/register-state';
import { setModalTitle, setSubmitButtonText, closeModal } from '../ui/modal-controller';
import { openGoalDetailModal } from '../../../lib/goal-detail-modal';
import { handleGoalSubmit } from './submit-handler';
import { resetModalState } from '../ui/form-resetter';
import { setupManagerSelectEvent } from '../events/manager-events';
import { setupDatePickerEvents } from '../events/datepicker-events';
import { setupClientDropdownEvents } from '../events/client-events';
import { getActionItemsByGoalId } from '../services/action-service';
import { updateCategoryDropdownVisual } from '../setup-global-goal-events';
import type { GoalRegisterContext } from '@shared/types';
import type { GoalWithRevenue } from '@shared/types';

export async function openGoalEditModal(
  goal: GoalWithRevenue & { manager_id?: number; start_date?: string; end_date?: string; goal_category?: string; start_revenue?: number | null; goal_revenue?: number },
  context: GoalRegisterContext
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    console.error('[openGoalEditModal] Supabase 클라이언트 없음');
    return;
  }

  if (context.closeGoalDetailModal) {
    context.closeGoalDetailModal();
  }

  resetModalState(context);

  setEditModeState(true, goal.id, { ...goal });

  const modal = getCachedElementById('goal-register-modal');
  if (!modal) return;

  setModalTitle('EDIT OBJECTIVE');
  setSubmitButtonText('수정하기');

  let managerId: number | undefined = goal.manager_id;

  if (!managerId) {
    const { data: goalData } = await supabase
      .from('ads_data_goal')
      .select('manager_id')
      .eq('id', goal.id)
      .single();
    if (goalData) {
      managerId = (goalData as { manager_id: number }).manager_id;
    }
  }

  const managerSelect = document.getElementById(
    'goal-manager-select'
  ) as HTMLSelectElement | null;
  if (managerSelect) {
    if (context.loadGoalManagerOptions) {
      await context.loadGoalManagerOptions();
    }

    setupManagerSelectEvent(context);

    const managerSelectUpdated = document.getElementById(
      'goal-manager-select'
    ) as HTMLSelectElement | null;
    if (managerSelectUpdated) {
      managerSelectUpdated.value = String(managerId ?? '');
      managerSelectUpdated.disabled = true;
      managerSelectUpdated.style.background = '#f5f5f5';
      managerSelectUpdated.style.color = '#666';
    }

    if (context.loadClientList && managerId != null) {
      await context.loadClientList(managerId);
    }
  }

  const dateInput = document.getElementById('goal-date-input');
  const datePickerIcon = document.getElementById('open-date-picker-btn');
  if (dateInput && goal.start_date) {
    (dateInput as HTMLInputElement).value = formatDate(
      new Date(goal.start_date)
    );
    (dateInput as HTMLInputElement).disabled = true;
    dateInput.style.background = '#f5f5f5';
    dateInput.style.color = '#666';
  }
  if (datePickerIcon) {
    datePickerIcon.style.opacity = '0.5';
    datePickerIcon.style.cursor = 'not-allowed';
    datePickerIcon.style.pointerEvents = 'none';
  }

  setupDatePickerEvents(context);

  // 카테고리 hidden input + 비주얼 드롭다운 업데이트
  const categoryValue = goal.goal_category ?? 'upsales_big';
  const categoryInput = document.getElementById('goal-category-select') as HTMLInputElement | null;
  if (categoryInput) {
    categoryInput.value = categoryValue;
  }
  updateCategoryDropdownVisual(categoryValue);

  const memoInput = document.getElementById('goal-memo-input');
  if (memoInput) {
    (memoInput as HTMLInputElement).value = goal.memo ?? '';
  }

  const startRevenueInput = document.getElementById('start-revenue-input');
  if (startRevenueInput) {
    if (
      goal.start_revenue !== null &&
      goal.start_revenue !== undefined
    ) {
      (startRevenueInput as HTMLInputElement).value = formatNumberWithCommas(
        goal.start_revenue
      );
    } else {
      (startRevenueInput as HTMLInputElement).value = '';
    }
    (startRevenueInput as HTMLInputElement).disabled = true;
    startRevenueInput.style.background = '#f5f5f5';
    startRevenueInput.style.color = '#666';
  }

  const goalRevenueInput = document.getElementById('goal-revenue-input');
  if (goalRevenueInput && goal.goal_revenue != null) {
    (goalRevenueInput as HTMLInputElement).value = formatNumberWithCommas(
      goal.goal_revenue
    );
  }

  const { data: targetClients, error: clientError } = await supabase
    .from('ads_data_goal_targetclient')
    .select('client_id')
    .eq('goal_id', goal.id);

  if (!clientError && targetClients) {
    for (const tc of targetClients as { client_id: number }[]) {
      context.selectedClientIds.add(String(tc.client_id));
    }
    if (context.renderSelectedClients) context.renderSelectedClients();
    if (context.updateClientSelectCount) context.updateClientSelectCount();
    if (context.updateHiddenInput) context.updateHiddenInput();
  }

  setupClientDropdownEvents(context);

  const existingActionItems = await getActionItemsByGoalId(goal.id);
  if (existingActionItems?.length > 0 && context.renderExistingActionItems) {
    context.renderExistingActionItems(existingActionItems);
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const goalForm = document.getElementById('goal-register-form');
  if (goalForm) {
    const formEl = goalForm as HTMLFormElement & {
      _submitHandler?: (e: SubmitEvent) => void;
    };
    if (formEl._submitHandler) {
      goalForm.removeEventListener('submit', formEl._submitHandler);
    }

    const submitHandler = async (event: Event): Promise<void> => {
      await handleGoalSubmit(event as SubmitEvent, context);
    };
    formEl._submitHandler = submitHandler;
    goalForm.addEventListener('submit', submitHandler);
  }

  const closeModalBtn = document.getElementById('close-goal-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-goal-modal-btn');

  const handleClose = async (): Promise<void> => {
    closeModal(context);
    if (goal) {
      await openGoalDetailModal(goal);
    }
  };

  if (closeModalBtn) {
    closeModalBtn.onclick = null;
    closeModalBtn.addEventListener('click', handleClose);
  }
  if (cancelModalBtn) {
    cancelModalBtn.onclick = null;
    cancelModalBtn.addEventListener('click', handleClose);
  }

  modal.onclick = null;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.stopPropagation();
      handleClose();
    }
  });
}
