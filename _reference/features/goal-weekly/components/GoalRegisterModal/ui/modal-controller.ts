/**
 * 목표 등록 모달 UI 컨트롤러
 */

import { getCachedElementById } from '@shared/lib';
import type { GoalRegisterContext } from '@shared/types';

export function openModal(modalId = 'goal-register-modal'): HTMLElement | null {
  const modal = getCachedElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
  return modal as HTMLElement | null;
}

export function closeModal(context: GoalRegisterContext): void {
  const modal = getCachedElementById('goal-register-modal');
  if (modal) {
    modal.classList.remove('active');
  }

  document.body.style.overflow = '';

  const modalTitle = document.querySelector('#goal-register-modal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'NEW OBJECTIVE';
  }

  const submitBtn = document.querySelector('#goal-register-form .btn-submit');
  if (submitBtn) {
    submitBtn.textContent = '등록하기';
  }

  if (context?.resetModalState) {
    context.resetModalState(context);
  }
}

export function setModalTitle(title: string): void {
  const modalTitle = document.querySelector('#goal-register-modal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = title;
  }
}

export function setSubmitButtonText(text: string): void {
  const submitBtn = document.querySelector('#goal-register-form .btn-submit');
  if (submitBtn) {
    submitBtn.textContent = text;
  }
}
