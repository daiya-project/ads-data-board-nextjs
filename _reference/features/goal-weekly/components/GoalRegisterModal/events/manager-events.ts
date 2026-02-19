/**
 * 목표 등록 - 담당자 선택 이벤트 핸들러
 */

import type { GoalRegisterContext } from '@shared/types';

export function setupManagerSelectEventOnly(
  context: GoalRegisterContext
): void {
  const managerSelect = document.getElementById(
    'goal-manager-select'
  ) as HTMLSelectElement | null;
  if (!managerSelect) return;

  if ((managerSelect as HTMLSelectElement & { _changeHandler?: (e: Event) => void })._changeHandler) {
    managerSelect.removeEventListener(
      'change',
      (managerSelect as HTMLSelectElement & { _changeHandler: (e: Event) => void })._changeHandler
    );
  }

  const changeHandler = async function (this: HTMLSelectElement, e: Event): Promise<void> {
    const selectedManagerId = (e.target as HTMLSelectElement).value;
    console.log('[담당자 선택] 변경됨:', selectedManagerId);

    if (selectedManagerId && context.loadClientList) {
      console.log('[담당자 선택] 광고주 목록 로드 시작');

      context.selectedClientIds.clear();
      await context.loadClientList(parseInt(selectedManagerId, 10));
      console.log('[담당자 선택] 광고주 목록 로드 완료');

      if (context.renderSelectedClients) context.renderSelectedClients();
      if (context.updateClientSelectCount) context.updateClientSelectCount();
      if (context.updateHiddenInput) context.updateHiddenInput();

      const startRevenueInput = document.getElementById('start-revenue-input');
      if (startRevenueInput) (startRevenueInput as HTMLInputElement).value = '';

      const goalRevenueInput = document.getElementById('goal-revenue-input');
      if (goalRevenueInput) (goalRevenueInput as HTMLInputElement).value = '';

      if (context.lastPercentage) context.lastPercentage.value = null;
    } else {
      console.log(
        '[담당자 선택] 담당자가 선택되지 않았거나 loadClientList 함수가 없음'
      );
      const optionsContainer = document.getElementById('client-select-options');
      if (optionsContainer) {
        optionsContainer.innerHTML =
          '<li class="multi-select-option loading">담당자를 먼저 선택해주세요.</li>';
      }
    }
  };

  (managerSelect as HTMLSelectElement & { _changeHandler?: (e: Event) => void })._changeHandler = changeHandler;
  managerSelect.addEventListener('change', changeHandler);
}

export function setupManagerSelectEvent(context: GoalRegisterContext): void {
  const managerSelect = document.getElementById(
    'goal-manager-select'
  ) as HTMLSelectElement | null;
  if (!managerSelect) return;

  const currentValue = managerSelect.value;
  const isDisabled = managerSelect.disabled;

  const newManagerSelect = managerSelect.cloneNode(true) as HTMLSelectElement;
  newManagerSelect.value = currentValue;
  newManagerSelect.disabled = isDisabled;

  managerSelect.parentNode?.replaceChild(newManagerSelect, managerSelect);

  newManagerSelect.addEventListener('change', async function (e) {
    const selectedManagerId = (e.target as HTMLSelectElement).value;
    console.log('[담당자 선택] 변경됨:', selectedManagerId);

    if (selectedManagerId && context.loadClientList) {
      console.log('[담당자 선택] 광고주 목록 로드 시작');
      context.selectedClientIds.clear();
      await context.loadClientList(parseInt(selectedManagerId, 10));
      console.log('[담당자 선택] 광고주 목록 로드 완료');

      if (context.renderSelectedClients) context.renderSelectedClients();
      if (context.updateClientSelectCount) context.updateClientSelectCount();
      if (context.updateHiddenInput) context.updateHiddenInput();

      const startRevenueInput = document.getElementById('start-revenue-input');
      if (startRevenueInput)
        (startRevenueInput as HTMLInputElement).value = '';

      const goalRevenueInput = document.getElementById('goal-revenue-input');
      if (goalRevenueInput) (goalRevenueInput as HTMLInputElement).value = '';

      if (context.lastPercentage) context.lastPercentage.value = null;
    } else {
      console.log(
        '[담당자 선택] 담당자가 선택되지 않았거나 loadClientList 함수가 없음'
      );
    }
  });
}
