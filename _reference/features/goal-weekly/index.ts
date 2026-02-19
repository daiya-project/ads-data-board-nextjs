/**
 * Goal Weekly Feature — 진입점 (Phase 5b/5c)
 * goals/·action·action-globals·card·modal·render-detail-modal → feature lib/·GoalCard 이전 완료.
 * modals/goal-register·goal-register-helpers는 re-export 유지 (GoalRegisterModal은 re-export 진입점만 확보).
 */

import './weekly-goal.css';
import './components/GoalCard/GoalCard.css';
import './components/WeekNavigation/WeekNavigation.css';

// lib — 목표 데이터 · 상태
export { loadGoalsWithRevenue, loadGoalSetting } from './lib/goal-data';
export {
  weeklyGoalState,
  exposeWeeklyGoalState,
  setCurrentManagerTab,
} from './lib/state';
export type { WeekGroup, WeekNavigationState, WeeklyGoalState } from './lib/types';

// lib — 주간 데이터 · 탭 · (레거시 3col) 네비
export { loadAllManagersGoals, loadManagerGoals } from './lib/data';
export { loadManagerTabs } from './components/ManagerTabs';
export { handleWeekNavigation } from './lib/navigation';
export { renderGoalCards, renderSummarySection } from './components/GoalCard';

// WeekNavigation (주차 카드 뷰)
export {
  refreshWeekNavigation,
  switchManagerNavigation,
  switchToAllManagersNavigation,
  initializeWeekNavigation,
  initializeWeekNavigationForAll,
  getCurrentNavigationState,
  invalidateActionItemsCache,
} from './components/WeekNavigation/WeekNavigation';

// GoalRegisterModal (등록 모달 — 구현은 components에 두고 re-export)
export {
  openGoalModal,
  closeGoalModal,
  setExternalState,
  getEditModeState,
  setEditModeState,
  handleGoalSubmit,
  renderGoalRegisterModal,
  setupAllGoalEvents,
  setupGoalModalEvents,
  setupGoalFormEvents,
  setupActionItemEvents,
  updateCategoryDropdownVisual,
} from './components/GoalRegisterModal';

// GoalCard — 상세 모달 렌더 · 카드 생성 (feature 로컬)
export { renderGoalDetailModal } from './components/GoalCard/render-detail-modal';
export { createGoalCard, createSummaryCard } from './components/GoalCard/card';

// lib — 상세/요약 모달
export {
  openGoalDetailModal,
  closeGoalDetailModal,
  openSummaryDetailModal,
  toggleSummarySection,
  type OpenGoalDetailModalOptions,
} from './lib/goal-detail-modal';

// lib — 액션 아이템 · 전역 액션
export {
  renderActionItemHTML,
  handleActionItemStatusToggle,
  showActionItemMemoInput,
  updateActionItemUI,
} from './lib/action';
export {
  setupActionGlobals,
  toggleActionItemStatus,
  saveActionMemo,
} from './lib/action-globals';

// GoalRegisterModal — 등록 컨텍스트·상태 (로컬)
export {
  createGoalRegisterContext,
  setupGlobalContext,
  setLoadManagerGoalsCallback,
  loadGoalManagerOptions,
  closeGoalModalWrapper,
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
  showToast,
} from './components/GoalRegisterModal';
export type { GoalRegisterContext } from './components/GoalRegisterModal';
export {
  goalRegisterState,
  resetGoalRegisterState,
  setEditMode,
  addSelectedClient,
  removeSelectedClient,
  clearSelectedClients,
  getSelectedClientIds,
} from './components/GoalRegisterModal';
export type { GoalRegisterState } from './components/GoalRegisterModal';
