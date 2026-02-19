/**
 * Goal 등록 모달 — Feature 내부 (Phase 5b/5c)
 * 구현 파일을 GoalRegisterModal/ 하위로 물리 이전 완료.
 */

import './Modals.css';
import './Forms.css';

export {
  setExternalState,
  getEditModeState,
  setEditModeState,
  resetEditMode,
} from './state/register-state';

export {
  calculateWeeklyDates,
  calculateMonthlyDates,
} from './utils/date-calculator';

export {
  validateForm,
  validateRequiredFields,
  validateObjective,
  validateActionItems,
} from './validation/form-validator';

export {
  createGoal,
  updateGoal,
  deleteGoalTargetClients,
  addGoalTargetClients,
} from './services/goal-service';

export {
  addActionItems,
  getActionItemsByGoalId,
} from './services/action-service';

export {
  setupManagerSelectEvent,
  setupManagerSelectEventOnly,
} from './events/manager-events';

export {
  setupDatePickerEvents,
  cleanupDatePickerEvents,
} from './events/datepicker-events';

export { setupClientDropdownEvents } from './events/client-events';

export {
  openModal,
  closeModal as closeGoalModal,
  setModalTitle,
  setSubmitButtonText,
} from './ui/modal-controller';

export { resetModalState } from './ui/form-resetter';

export { openGoalModal } from './handlers/open-modal';
export { openGoalEditModal } from './handlers/open-edit-modal';
export { openGoalCloneModal } from './handlers/open-clone-modal';
export { handleGoalSubmit } from './handlers/submit-handler';

export { renderGoalRegisterModal } from './render-modal';

// Phase 2.5: 이벤트 버스 연동 전역 setup (events/goal-events.ts 이전)
export {
  setupAllGoalEvents,
  setupGoalModalEvents,
  setupGoalFormEvents,
  setupActionItemEvents,
  updateCategoryDropdownVisual,
} from './setup-global-goal-events';

// goal-register-helpers 통합 (context, state)
export type { GoalRegisterContext } from './state/context';
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
} from './state/context';
export {
  goalRegisterState,
  resetGoalRegisterState,
  setEditMode,
  addSelectedClient,
  removeSelectedClient,
  clearSelectedClients,
  getSelectedClientIds,
} from './state/helpers-state';
export type { GoalRegisterState } from './state/helpers-state';
