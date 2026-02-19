/**
 * 목표 등록 모달 열기
 */

import { getCachedElementById } from '@shared/lib';
import { setupManagerSelectEventOnly } from '../events/manager-events';
import { setupDatePickerEvents } from '../events/datepicker-events';
import { setupClientDropdownEvents } from '../events/client-events';
import { setEditModeState, resetEditMode } from '../state/register-state';
import { resetModalState } from '../ui/form-resetter';
import { closeModal } from '../ui/modal-controller';
import { handleGoalSubmit } from './submit-handler';
import { calculateWeeklyDates } from '../utils/date-calculator';
import type { GoalRegisterContext } from '@shared/types';

export async function openGoalModal(context: GoalRegisterContext): Promise<void> {
  const modal = getCachedElementById('goal-register-modal');
  if (!modal) return;

  resetModalState(context);

  setEditModeState(false, null, null);
  if (context.lastPercentage) {
    context.lastPercentage.value = null;
  }

  resetEditMode();

  if (context.loadGoalManagerOptions) {
    await context.loadGoalManagerOptions();
  }

  setupManagerSelectEventOnly(context);

  const managerSelect = document.getElementById(
    'goal-manager-select'
  ) as HTMLSelectElement | null;
  if (managerSelect) {
    if (context.currentManagerTabId) {
      managerSelect.value = context.currentManagerTabId;
      managerSelect.disabled = true;

      if (context.loadClientList) {
        await context.loadClientList(
          parseInt(context.currentManagerTabId, 10)
        );
      }
    } else {
      managerSelect.disabled = false;
      managerSelect.value = '';

      const optionsContainer = document.getElementById('client-select-options');
      if (optionsContainer) {
        optionsContainer.innerHTML =
          '<li class="multi-select-option loading">담당자를 먼저 선택해주세요.</li>';
      }
    }
  }

  setupDatePickerEvents(context);
  setupClientDropdownEvents(context);

  await setTodayDate(context);

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

  const handleClose = (): void => {
    closeModal(context);
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

async function setTodayDate(context: GoalRegisterContext): Promise<void> {
  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const dateInput = document.getElementById('goal-date-input');
    if (dateInput) {
      // 값은 파싱 가능한 YYYY-MM-DD (제출 시 calculateWeeklyDates가 자동으로 주차 변환)
      (dateInput as HTMLInputElement).value = todayStr;
    }

    if (context.datePickerState) {
      context.datePickerState.selectedDate = today;
    }
  } catch (error) {
    console.error('[setTodayDate] 오류:', error);
  }
}
