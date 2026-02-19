/**
 * 목표 등록/수정 - 폼 데이터 수집
 */

import { removeCommas } from '@shared/lib';

export interface FormDataCollected {
  managerId: string;
  periodType: 'weekly' | 'monthly';
  dateInput: string;
  category: string;
  memo: string;
  startRevenue: string | null;
  goalRevenue: string;
  actionItemInputs: NodeListOf<Element>;
}

export function collectFormData(): FormDataCollected {
  const managerId = (
    document.getElementById('goal-manager-select') as HTMLSelectElement
  ).value;
  const periodType: 'weekly' | 'monthly' = 'weekly';
  const dateInput = (
    document.getElementById('goal-date-input') as HTMLInputElement
  ).value;
  const category = (
    document.getElementById('goal-category-select') as HTMLSelectElement
  ).value;
  const memo = (
    document.getElementById('goal-memo-input') as HTMLInputElement
  ).value.trim();
  const startRevenueInput = document.getElementById(
    'start-revenue-input'
  ) as HTMLInputElement | null;
  const goalRevenueInput = document.getElementById(
    'goal-revenue-input'
  ) as HTMLInputElement;
  const startRevenue = startRevenueInput
    ? removeCommas(startRevenueInput.value)
    : null;
  const goalRevenue = removeCommas(goalRevenueInput.value);
  const actionItemInputs = document.querySelectorAll('.action-item-input');

  return {
    managerId,
    periodType,
    dateInput,
    category,
    memo,
    startRevenue,
    goalRevenue,
    actionItemInputs,
  };
}
