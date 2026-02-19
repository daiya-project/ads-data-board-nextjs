/**
 * Goal Register Context Factory 모듈
 * main.ts에서 분리됨 (라인 1232-1290)
 * 목표 등록/수정에 필요한 컨텍스트 객체 생성
 */

import {
  getCachedElementById,
  formatNumberWithCommas,
  removeCommas,
  showToast as showToastModule,
} from '@shared/lib';
import { goalRegisterState, type GoalRegisterState } from './helpers-state';
import { weeklyGoalState, type DatePickerState } from '../../../lib/state';
import { loadGoalManagerOptions as loadGoalManagerOptionsModule } from '../services/client-loader';
import { loadClientList as loadClientListModule } from '../services/client-loader';
import { renderClientOptions as renderClientOptionsModule } from '../ui/client-render';
import { renderSelectedClients as renderSelectedClientsModule, renderSelectedClientsInRightPanel as renderSelectedClientsInRightPanelModule, calculateGoalRevenueFromPercentage as calculateGoalRevenueFromPercentageModule } from '../ui/client-render';
import { recalculateStartRevenueForEdit as recalculateStartRevenueForEditModule, calculateStartRevenue as calculateStartRevenueModule } from '../utils/revenue-calculator';
import { toggleClientSelection as toggleClientSelectionModule } from '../services/client-loader';
import { calculateWeeklyDates, calculateMonthlyDates } from '../utils/date-calculator';
import { closeModal as closeGoalModal } from '../ui/modal-controller';
import { closeGoalDetailModal } from '../../../lib/goal-detail-modal';
import { openDatePicker as openDatePickerModule, closeDatePicker as closeDatePickerModule, renderDatePicker as renderDatePickerModule, selectDate as selectDateModule, changeDatePickerMonth as changeDatePickerMonthModule, selectTodayDate as selectTodayDateModule } from '@shared/ui/common/DatePicker';
import { escapeHtml } from '@shared/lib';

// Window 인터페이스 확장
declare global {
  interface Window {
    goalRegisterContext?: GoalRegisterContext | null;
    createGoalRegisterContext?: () => GoalRegisterContext;
    closeGoalModalWrapper?: () => void;
  }
}

// 컨텍스트 타입 정의
export interface GoalRegisterContext {
  selectedClientIds: Set<number>;
  availableClients: GoalRegisterState['availableClients'];
  currentManagerTabId: number | null;
  lastPercentage: { value: number | null };
  datePickerState: DatePickerState;
  isEditMode: boolean;
  editGoalId: number | null;
  originalGoalData: unknown | null;
  loadGoalManagerOptions: () => Promise<void>;
  loadClientList: (managerId: number) => Promise<void>;
  renderClientOptions: (clients: GoalRegisterState['availableClients'], searchTerm?: string) => void;
  renderSelectedClients: () => void;
  updateClientSelectCount: () => void;
  updateHiddenInput: () => void;
  renderSelectedClientsInRightPanel: () => void;
  clearAllClients: () => void;
  calculateStartRevenue: () => Promise<void>;
  resetActionItems: () => void;
  addActionItemInput: () => void;
  renderExistingActionItems: (actionItems: Array<{ id: number; action_item?: string }>) => void;
  showToast: (message: string) => void;
  loadManagerGoals: (managerId: number, forceRefreshGoalIds?: number[]) => Promise<void>;
  recalculateStartRevenueForEdit: (goalId: number, startDate: string, periodType: 'weekly' | 'monthly') => Promise<void>;
  closeGoalDetailModal: () => void;
  onGoalSaved: () => Promise<void>;
  openDatePicker: () => void;
  closeDatePicker: () => void;
  renderDatePicker: () => void;
  selectDate: (date: Date) => Promise<void>;
  changeDatePickerMonth: (delta: number) => void;
  selectTodayDate: () => void;
}

// loadManagerGoals 콜백 저장
let loadManagerGoalsCallback: ((managerId: number, forceRefreshGoalIds?: number[]) => Promise<void>) | null = null;

export function setLoadManagerGoalsCallback(callback: (managerId: number, forceRefreshGoalIds?: number[]) => Promise<void>): void {
  loadManagerGoalsCallback = callback;
}

// 래퍼 함수들
async function loadGoalManagerOptions(): Promise<void> {
  return loadGoalManagerOptionsModule();
}

async function loadClientList(managerId: number): Promise<void> {
  return loadClientListModule(managerId, goalRegisterState.availableClients, renderClientOptions);
}

function renderClientOptions(clients: GoalRegisterState['availableClients'], searchTerm = ''): void {
  return renderClientOptionsModule(clients, searchTerm, goalRegisterState.selectedClientIds as unknown as Set<string>, toggleClientSelection);
}

async function toggleClientSelection(clientId: string): Promise<void> {
  return toggleClientSelectionModule(clientId, goalRegisterState.selectedClientIds as unknown as Set<string>, calculateStartRevenue, renderSelectedClients, renderSelectedClientsInRightPanel, renderClientOptions, goalRegisterState.availableClients);
}

async function recalculateStartRevenueForEdit(goalId: number, startDate: string, periodType: 'weekly' | 'monthly'): Promise<void> {
  return recalculateStartRevenueForEditModule(goalId, startDate, periodType, calculateWeeklyDates, calculateMonthlyDates);
}

async function calculateStartRevenue(): Promise<void> {
  return calculateStartRevenueModule(goalRegisterState.selectedClientIds as unknown as Set<string>, calculateWeeklyDates, calculateMonthlyDates);
}

function renderSelectedClients(): void {
  return renderSelectedClientsModule(goalRegisterState.selectedClientIds as unknown as Set<string>, goalRegisterState.availableClients, toggleClientSelection);
}

function calculateGoalRevenueFromPercentage(percentageText: string): void {
  return calculateGoalRevenueFromPercentageModule(percentageText, goalRegisterState.lastPercentage);
}

function renderSelectedClientsInRightPanel(): void {
  return renderSelectedClientsInRightPanelModule(goalRegisterState.selectedClientIds as unknown as Set<string>, goalRegisterState.availableClients, toggleClientSelection);
}

// 선택 개수 업데이트
function updateClientSelectCount(): void {
  const countElement = document.getElementById('client-select-count');
  if (countElement) {
    countElement.textContent = `${goalRegisterState.selectedClientIds.size}개 선택됨`;
  }

  // 우측 패널도 업데이트
  renderSelectedClientsInRightPanel();
}

// Hidden input 업데이트
function updateHiddenInput(): void {
  const hiddenInput = document.getElementById('selected-client-ids') as HTMLInputElement | null;
  if (hiddenInput) {
    hiddenInput.value = Array.from(goalRegisterState.selectedClientIds).join(',');
  }
}

// 전체 해제
function clearAllClients(): void {
  goalRegisterState.selectedClientIds.clear();
  renderSelectedClients();
  renderSelectedClientsInRightPanel();
  const searchInput = document.getElementById('client-search-input') as HTMLInputElement | null;
  renderClientOptions(goalRegisterState.availableClients, searchInput?.value || '');
  updateClientSelectCount();
  updateHiddenInput();
}

// 액션 아이템 입력창 추가
function addActionItemInput(): void {
  const container = document.getElementById('action-items-container');
  if (!container) {
    return;
  }

  const actionIndex = container.querySelectorAll('.action-item-row').length;

  const actionItemRow = document.createElement('div');
  actionItemRow.className = 'action-item-row';
  actionItemRow.innerHTML = `
    <input type="text" class="form-input action-item-input" placeholder="Add Your Action Item" data-action-index="${actionIndex}" autocomplete="off">
    <button type="button" class="action-item-remove-btn remove-action-item-btn">
      <i class="ri-close-line"></i>
    </button>
    <button type="button" class="action-item-add-btn add-action-item-btn">
      <i class="ri-add-line"></i>
    </button>
  `;

  container.appendChild(actionItemRow);

  // 제거 버튼 이벤트 리스너
  const removeBtn = actionItemRow.querySelector('.remove-action-item-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function() {
      actionItemRow.remove();
    });
  }

  // 추가 버튼 이벤트 리스너
  const addBtn = actionItemRow.querySelector('.add-action-item-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      addActionItemInput();
    });
  }
}

// 액션 아이템 초기화 (첫 번째 입력창만 남기고 나머지 제거)
function resetActionItems(): void {
  const container = document.getElementById('action-items-container');
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="action-item-row">
      <input type="text" class="form-input action-item-input" placeholder="Add Your Action Item" data-action-index="0">
      <button type="button" class="action-item-add-btn" id="add-action-item-btn">
        <i class="ri-add-line"></i>
      </button>
    </div>
  `;

  // 더하기 버튼 이벤트 리스너 재설정
  const addBtn = document.getElementById('add-action-item-btn');
  if (addBtn) {
    addBtn.addEventListener('click', addActionItemInput);
  }
}

// 기존 액션 아이템 렌더링 (수정 모드용)
function renderExistingActionItems(actionItems: Array<{ id: number; action_item?: string }>): void {
  const container = document.getElementById('action-items-container');
  if (!container) return;

  // 컨테이너 초기화
  container.innerHTML = '';

  // 기존 액션 아이템들 추가 (readonly)
  actionItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'action-item-row';
    row.innerHTML = `
      <input type="text" 
        class="form-input action-item-input" 
        value="${escapeHtml(String(item.action_item || ''))}"
        data-action-index="${index}"
        data-action-item-id="${item.id}"
        readonly
        style="background: #f5f5f5; color: #666;">
      ${index === 0 ? `
      <button type="button" class="action-item-add-btn" id="add-action-item-btn">
        <i class="ri-add-line"></i>
      </button>
      ` : ''}
    `;
    container.appendChild(row);
  });

  // 액션 아이템 추가 버튼 이벤트 재설정
  const addBtn = document.getElementById('add-action-item-btn');
  if (addBtn) {
    addBtn.onclick = null;
    addBtn.addEventListener('click', addActionItemInput);
  }
}

// DatePicker 래퍼 함수들
function openDatePicker(): void {
  return openDatePickerModule(weeklyGoalState.datePickerState, renderDatePicker);
}

function closeDatePicker(): void {
  return closeDatePickerModule();
}

function renderDatePicker(): void {
  return renderDatePickerModule(weeklyGoalState.datePickerState, selectDate);
}

async function selectDate(date: Date): Promise<void> {
  return selectDateModule(date, weeklyGoalState.datePickerState, goalRegisterState.selectedClientIds as unknown as Set<string>, calculateStartRevenue, goalRegisterState.lastPercentage, closeDatePicker);
}

function changeDatePickerMonth(delta: number): void {
  return changeDatePickerMonthModule(delta, weeklyGoalState.datePickerState, renderDatePicker);
}

function selectTodayDate(): void {
  return selectTodayDateModule(selectDate);
}

function showToast(message: string): void {
  return showToastModule(message);
}

// loadManagerGoals 래퍼
async function loadManagerGoals(managerId: number, forceRefreshGoalIds?: number[]): Promise<void> {
  if (loadManagerGoalsCallback) {
    return loadManagerGoalsCallback(managerId, forceRefreshGoalIds);
  }
}

/**
 * Goal Register 컨텍스트 생성
 */
export function createGoalRegisterContext(): GoalRegisterContext {
  return {
    selectedClientIds: goalRegisterState.selectedClientIds,
    availableClients: goalRegisterState.availableClients,
    currentManagerTabId: weeklyGoalState.currentManagerTabId,
    lastPercentage: goalRegisterState.lastPercentage,
    datePickerState: weeklyGoalState.datePickerState,
    isEditMode: goalRegisterState.isEditMode,
    editGoalId: goalRegisterState.editGoalId,
    originalGoalData: goalRegisterState.originalGoalData,
    loadGoalManagerOptions,
    loadClientList,
    renderClientOptions,
    renderSelectedClients,
    updateClientSelectCount,
    updateHiddenInput,
    renderSelectedClientsInRightPanel,
    clearAllClients,
    calculateStartRevenue,
    resetActionItems,
    addActionItemInput,
    renderExistingActionItems,
    showToast,
    loadManagerGoals,
    recalculateStartRevenueForEdit,
    closeGoalDetailModal,
    async onGoalSaved() {
      const tab = getCachedElementById('goal-monthly-tab');
      if (tab?.classList.contains('active')) {
        const { initGoalMonthly } = await import('../../../../../features/goal-monthly');
        await initGoalMonthly();
      }
    },
    openDatePicker,
    closeDatePicker,
    renderDatePicker,
    selectDate,
    changeDatePickerMonth,
    selectTodayDate
  };
}

/**
 * closeGoalModal 래퍼 함수
 */
export function closeGoalModalWrapper(): void {
  window.goalRegisterContext = createGoalRegisterContext();
  closeGoalModal(window.goalRegisterContext);
}

/**
 * 전역 컨텍스트 설정
 */
export function setupGlobalContext(): void {
  window.goalRegisterContext = null;
  window.createGoalRegisterContext = createGoalRegisterContext;
  window.closeGoalModalWrapper = closeGoalModalWrapper;
}

export {
  loadGoalManagerOptions,
  loadClientList,
  renderClientOptions,
  toggleClientSelection,
  recalculateStartRevenueForEdit,
  calculateStartRevenue,
  renderSelectedClients,
  calculateGoalRevenueFromPercentage,
  renderSelectedClientsInRightPanel,
  updateClientSelectCount,
  updateHiddenInput,
  clearAllClients,
  addActionItemInput,
  resetActionItems,
  renderExistingActionItems,
  openDatePicker,
  closeDatePicker,
  renderDatePicker,
  selectDate,
  changeDatePickerMonth,
  selectTodayDate,
  showToast
};
