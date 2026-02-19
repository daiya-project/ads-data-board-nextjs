/**
 * Goal Register 상태 관리 모듈
 * main.ts에서 분리됨
 */

export interface GoalRegisterState {
  isEditMode: boolean;
  editGoalId: number | null;
  originalGoalData: Record<string, unknown> | null;
  selectedClientIds: Set<number>;
  availableClients: Array<{
    client_id: number;
    client_name: string;
    lastWeekRevenue?: number;
    [key: string]: unknown;
  }>;
  lastPercentage: { value: number | null };
}

// Goal Register 상태 관리 객체
export const goalRegisterState: GoalRegisterState = {
  isEditMode: false,
  editGoalId: null,
  originalGoalData: null,
  selectedClientIds: new Set<number>(),
  availableClients: [],
  lastPercentage: { value: null }
};

// 상태 초기화
export function resetGoalRegisterState(): void {
  goalRegisterState.isEditMode = false;
  goalRegisterState.editGoalId = null;
  goalRegisterState.originalGoalData = null;
  goalRegisterState.selectedClientIds.clear();
  goalRegisterState.availableClients = [];
  goalRegisterState.lastPercentage.value = null;
}

// 수정 모드 설정
export function setEditMode(isEdit: boolean, goalId: number | null, originalData: Record<string, unknown> | null): void {
  goalRegisterState.isEditMode = isEdit;
  goalRegisterState.editGoalId = goalId;
  goalRegisterState.originalGoalData = originalData;
}

// 선택된 클라이언트 ID 관리
export function addSelectedClient(clientId: number): void {
  goalRegisterState.selectedClientIds.add(clientId);
}

export function removeSelectedClient(clientId: number): void {
  goalRegisterState.selectedClientIds.delete(clientId);
}

export function clearSelectedClients(): void {
  goalRegisterState.selectedClientIds.clear();
}

export function getSelectedClientIds(): number[] {
  return Array.from(goalRegisterState.selectedClientIds);
}
