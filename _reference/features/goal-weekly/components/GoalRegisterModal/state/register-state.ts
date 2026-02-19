/**
 * 목표 등록 모달 상태 관리
 */

export interface EditModeState {
  isEditMode: boolean;
  editGoalId: number | null;
  originalGoalData: Record<string, unknown> | null;
}

export interface ExternalStateRef {
  isEditMode: boolean;
  editGoalId: number | null;
  originalGoalData: Record<string, unknown> | null;
}

let externalState: ExternalStateRef | null = null;

export function setExternalState(state: ExternalStateRef | null): void {
  externalState = state;
}

export function getEditModeState(): EditModeState {
  if (externalState) {
    return {
      isEditMode: externalState.isEditMode,
      editGoalId: externalState.editGoalId,
      originalGoalData: externalState.originalGoalData,
    };
  }
  return {
    isEditMode: false,
    editGoalId: null,
    originalGoalData: null,
  };
}

export function setEditModeState(
  editMode: boolean,
  goalId: number | null = null,
  goalData: Record<string, unknown> | null = null
): void {
  if (externalState) {
    externalState.isEditMode = editMode;
    externalState.editGoalId = goalId;
    externalState.originalGoalData = goalData;
    console.log('[상태 설정] 수정 모드:', editMode, 'Goal ID:', goalId);
  }
}

export function resetEditMode(): void {
  const modalTitle = document.querySelector('#goal-register-modal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'NEW OBJECTIVE';
  }

  const submitBtn = document.querySelector('#goal-register-form .btn-submit');
  if (submitBtn) {
    submitBtn.textContent = '등록하기';
  }

  const goalDateInput = document.getElementById('goal-date-input');
  if (goalDateInput) {
    (goalDateInput as HTMLInputElement).disabled = false;
  }
}
