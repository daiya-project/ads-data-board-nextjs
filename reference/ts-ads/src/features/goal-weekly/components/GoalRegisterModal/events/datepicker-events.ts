/**
 * 목표 등록 - 날짜 선택 이벤트 핸들러 (Clean Rewrite)
 * AbortController 기반 — cloneNode 사용 안 함
 */

import type { GoalRegisterContext } from '@shared/types';

let abortController: AbortController | null = null;

export function setupDatePickerEvents(context: GoalRegisterContext): void {
  // 기존 리스너 정리
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  const { signal } = abortController;

  // 달력 아이콘 클릭
  const openBtn = document.getElementById('open-date-picker-btn');
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      context.openDatePicker?.();
    }, { signal });
  }

  // 날짜 입력창 클릭
  const goalDateInput = document.getElementById('goal-date-input');
  if (goalDateInput) {
    goalDateInput.addEventListener('click', (e) => {
      if ((goalDateInput as HTMLInputElement).disabled) return;
      e.preventDefault();
      e.stopPropagation();
      context.openDatePicker?.();
    }, { signal });
  }
}

/**
 * 이벤트 리스너 정리
 */
export function cleanupDatePickerEvents(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
