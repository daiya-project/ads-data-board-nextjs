/**
 * 목표 등록 모달 전역 DOM 이벤트 설정 (이벤트 버스 연동)
 * Phase 2.5: events/goal-events.ts 로직을 goal-weekly로 이전하고 event-bus 사용.
 */

import { devLog, formatNumberWithCommas, removeCommas } from '@shared/lib';
import { emit, on } from '../../../../shared/lib/event-bus';
import { getEditModeState } from './state/register-state';
import { openGoalDetailModal } from '../../lib/goal-detail-modal';
import {
  createGoalRegisterContext,
  closeGoalModalWrapper,
  openDatePicker,
  calculateGoalRevenueFromPercentage,
  calculateStartRevenue,
  addActionItemInput,
} from './state/context';
import { goalRegisterState } from './state/helpers-state';
import { handleGoalSubmit } from './handlers/submit-handler';

declare global {
  interface Window {
    goalRegisterContext?: import('./state/context').GoalRegisterContext | null;
  }
}

async function handleGoalSubmitWrapper(event: Event): Promise<void> {
  devLog('handleGoalSubmitWrapper 호출됨');
  if (!window.goalRegisterContext) {
    devLog('컨텍스트 생성 중...');
    window.goalRegisterContext = createGoalRegisterContext();
  }
  devLog('handleGoalSubmit 호출 시작');
  await handleGoalSubmit(event, window.goalRegisterContext);
  devLog('handleGoalSubmit 완료');
}

function setupNumberInput(input: HTMLInputElement | null): void {
  if (!input) return;

  input.addEventListener('input', function (e: Event) {
    const target = e.target as HTMLInputElement;
    const numbers = target.value.replace(/[^\d]/g, '');
    target.value = formatNumberWithCommas(numbers);
  });

  input.addEventListener('keypress', function (e: KeyboardEvent) {
    const char = String.fromCharCode(e.which);
    if (!/[0-9]/.test(char)) {
      e.preventDefault();
    }
  });
}

/**
 * 목표 모달 이벤트 설정 — 이벤트 버스 'goal:modal:close-requested' 구독으로 닫기 처리
 */
export function setupGoalModalEvents(): void {
  on('goal:modal:close-requested', () => {
    const editState = getEditModeState();
    if (editState.isEditMode && editState.originalGoalData) {
      openGoalDetailModal(editState.originalGoalData as Record<string, unknown>);
    }
    closeGoalModalWrapper();
  });

  const closeModalBtn = document.getElementById('close-goal-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-goal-modal-btn');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => emit('goal:modal:close-requested', undefined));
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', () => emit('goal:modal:close-requested', undefined));
  }

  const modalOverlay = document.getElementById('goal-register-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e: Event) => {
      if (e.target === modalOverlay) {
        emit('goal:modal:close-requested', undefined);
      }
    });
  }
}

/**
 * DatePicker 트리거 버튼/입력 전역 바인딩 (모달 렌더 후 한 번 호출, setupAllGoalEvents 내부에서만 사용)
 */
function setupDatePickerTriggerEvents(): void {
  const openDatePickerBtn = document.getElementById('open-date-picker-btn');
  if (openDatePickerBtn) {
    openDatePickerBtn.addEventListener('click', openDatePicker);
  }

  const goalDateInput = document.getElementById('goal-date-input');
  if (goalDateInput) {
    goalDateInput.addEventListener('click', openDatePicker);
  }
}

function setupCategoryDropdown(): void {
  const dropdown = document.getElementById('goal-category-dropdown');
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.GoalRegisterForm__categoryTrigger');
  const menu = dropdown.querySelector('.GoalRegisterForm__categoryMenu');
  const hiddenInput = document.getElementById('goal-category-select') as HTMLInputElement | null;

  if (!trigger || !menu || !hiddenInput) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  menu.querySelectorAll('.GoalRegisterForm__categoryItem').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = (item as HTMLElement).dataset.value ?? '';
      const label = (item as HTMLElement).textContent?.trim() ?? '';

      hiddenInput.value = value;
      dropdown.setAttribute('data-value', value);

      const valueEl = trigger.querySelector('.GoalRegisterForm__categoryValue');
      const dotEl = trigger.querySelector('.GoalRegisterForm__categoryDot');
      if (valueEl) valueEl.textContent = label;
      if (dotEl) (dotEl as HTMLElement).setAttribute('data-category', value);

      menu.querySelectorAll('.GoalRegisterForm__categoryItem').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.classList.remove('open');
    }
  });
}

/**
 * 카테고리 드롭다운 비주얼만 업데이트 (이벤트 버스 'goal:category-dropdown:update'로도 호출 가능)
 */
export function updateCategoryDropdownVisual(value: string): void {
  const dropdown = document.getElementById('goal-category-dropdown');
  if (!dropdown) return;

  const LABELS: Record<string, string> = {
    upsales_big: '업세일 - 고래',
    upsales_smb: '업세일 - SMB',
    new: '신규',
    outbound: '아웃바운드',
    etc: '기타',
  };

  dropdown.setAttribute('data-value', value);

  const trigger = dropdown.querySelector('.GoalRegisterForm__categoryTrigger');
  if (trigger) {
    const valueEl = trigger.querySelector('.GoalRegisterForm__categoryValue');
    const dotEl = trigger.querySelector('.GoalRegisterForm__categoryDot');
    if (valueEl) valueEl.textContent = LABELS[value] ?? value;
    if (dotEl) (dotEl as HTMLElement).setAttribute('data-category', value);
  }

  const menu = dropdown.querySelector('.GoalRegisterForm__categoryMenu');
  if (menu) {
    menu.querySelectorAll('.GoalRegisterForm__categoryItem').forEach((item) => {
      const isActive = (item as HTMLElement).dataset.value === value;
      item.classList.toggle('active', isActive);
    });
  }
}

/**
 * 이벤트 버스로 카테고리 드롭다운 업데이트 구독 (다른 Feature에서 emit 시 반영)
 */
function subscribeCategoryDropdownUpdate(): void {
  on('goal:category-dropdown:update', (detail) => {
    if (detail?.value) updateCategoryDropdownVisual(detail.value);
  });
}

/**
 * 목표 폼 이벤트 설정
 */
export function setupGoalFormEvents(): void {
  const startRevenueInput = document.getElementById('start-revenue-input') as HTMLInputElement | null;
  const goalRevenueInput = document.getElementById('goal-revenue-input') as HTMLInputElement | null;

  setupNumberInput(startRevenueInput);
  setupNumberInput(goalRevenueInput);

  const goalMemoInput = document.getElementById('goal-memo-input') as HTMLTextAreaElement | null;
  if (goalMemoInput) {
    goalMemoInput.addEventListener('keydown', function (e: KeyboardEvent) {
      if (e.key === 'Enter') e.preventDefault();
    });
    goalMemoInput.addEventListener('input', function (e: Event) {
      const target = e.target as HTMLTextAreaElement;
      target.value = target.value.replace(/\n/g, '');
      calculateGoalRevenueFromPercentage(target.value);
    });
  }

  const dateInput = document.getElementById('goal-date-input') as HTMLInputElement | null;
  if (dateInput) {
    dateInput.addEventListener('change', async function () {
      await calculateStartRevenue();
      const lastPct = goalRegisterState.lastPercentage?.value;
      if (lastPct != null) {
        const startEl = document.getElementById('start-revenue-input') as HTMLInputElement | null;
        const goalEl = document.getElementById('goal-revenue-input') as HTMLInputElement | null;
        if (startEl && goalEl && startEl.value) {
          const startRevenue = parseInt(removeCommas(startEl.value), 10);
          if (!Number.isNaN(startRevenue)) {
            goalEl.value = formatNumberWithCommas(
              String(Math.round(startRevenue + (startRevenue * lastPct) / 100))
            );
          }
        }
      }
    });
  }

  const goalRevenueInputField = document.getElementById('goal-revenue-input') as HTMLInputElement | null;
  if (goalRevenueInputField) {
    goalRevenueInputField.addEventListener('input', function (e: Event) {
      const target = e.target as HTMLInputElement;
      const inputValue = target.value.trim();
      const percentMatch = inputValue.match(/^(\d+(?:\.\d+)?)\s*%?$/);

      if (percentMatch) {
        const percentage = parseFloat(percentMatch[1]);
        const startRevenueInput = document.getElementById(
          'start-revenue-input'
        ) as HTMLInputElement | null;

        if (startRevenueInput?.value) {
          const startRevenue = parseInt(startRevenueInput.value.replace(/,/g, ''), 10) || 0;
          if (startRevenue > 0) {
            const goalRevenue = Math.round(startRevenue * (percentage / 100));
            setTimeout(() => {
              target.value = goalRevenue.toLocaleString();
            }, 0);
            goalRegisterState.lastPercentage.value = percentage;
            devLog(`[백분율 계산] ${percentage}% → ${goalRevenue.toLocaleString()}`);
          }
        }
      }
    });
  }

  setupCategoryDropdown();
}

export function setupActionItemEvents(): void {
  const addActionItemBtn = document.getElementById('add-action-item-btn');
  if (addActionItemBtn) {
    addActionItemBtn.addEventListener('click', addActionItemInput);
  }
}

/**
 * 모든 목표 관련 전역 이벤트 설정 (이벤트 버스 구독 포함)
 */
export function setupAllGoalEvents(): void {
  subscribeCategoryDropdownUpdate();
  setupGoalModalEvents();
  setupDatePickerTriggerEvents();
  setupGoalFormEvents();
  setupActionItemEvents();
}
