/**
 * 목표 등록 폼 초기화
 */

import { devLog } from '@shared/lib';
import { updateCategoryDropdownVisual } from '../setup-global-goal-events';
import type { GoalRegisterContext } from '@shared/types';

export function resetModalState(context: GoalRegisterContext): void {
  devLog('[resetModalState] 모달 상태 초기화 시작');

  const beforeSize = context.selectedClientIds.size;
  context.selectedClientIds.clear();
  context.availableClients = [];
  devLog(
    `[resetModalState] selectedClientIds 초기화: ${beforeSize} -> ${context.selectedClientIds.size}`
  );

  const inputs = [
    'goal-manager-select',
    'start-revenue-input',
    'goal-revenue-input',
    'goal-memo-input',
    'client-search-input',
  ];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      const input = el as HTMLInputElement | HTMLSelectElement;
      input.value = '';
      input.disabled = false;
      input.style.background = '';
      input.style.color = '';
    }
  });

  const dateInput = document.getElementById('goal-date-input');
  const datePickerIcon = document.getElementById('open-date-picker-btn');
  if (dateInput) {
    (dateInput as HTMLInputElement).value = '';
    (dateInput as HTMLInputElement).disabled = false;
    dateInput.style.background = '';
    dateInput.style.color = '';
  }
  if (datePickerIcon) {
    datePickerIcon.style.opacity = '';
    datePickerIcon.style.cursor = '';
    datePickerIcon.style.pointerEvents = '';
  }

  // 카테고리 hidden input + 비주얼 드롭다운 초기화
  const categoryInput = document.getElementById('goal-category-select') as HTMLInputElement | null;
  if (categoryInput) {
    categoryInput.value = 'upsales_big';
  }
  updateCategoryDropdownVisual('upsales_big');

  const tagsContainer = document.getElementById('selected-clients-tags');
  const wrapper = document.getElementById('client-select-wrapper');
  const optionsContainer = document.getElementById('client-select-options');

  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    devLog('[resetModalState] tagsContainer 비움');
  }
  if (wrapper) {
    wrapper.classList.remove('has-tags');
  }
  if (optionsContainer) {
    optionsContainer.innerHTML =
      '<li class="multi-select-option loading">로딩 중...</li>';
  }

  const rightPanel = document.getElementById('modal-right-section');
  const modalContainer = document.querySelector(
    '#goal-register-modal .Modal__container'
  );
  if (rightPanel) {
    rightPanel.classList.remove('expanded');
    rightPanel.style.display = 'none';
    rightPanel.innerHTML = '';
  }
  if (modalContainer) {
    modalContainer.classList.remove('expanded', 'has-right-panel');
  }

  if (context.resetActionItems) {
    context.resetActionItems();
  }
  if (context.updateHiddenInput) {
    context.updateHiddenInput();
  }
  if (context.updateClientSelectCount) {
    context.updateClientSelectCount();
  }

  devLog('[resetModalState] 모달 상태 초기화 완료');
}
