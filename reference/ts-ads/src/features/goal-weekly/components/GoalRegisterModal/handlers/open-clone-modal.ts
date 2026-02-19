/**
 * 목표 복제 모달 열기
 * - 원본 goal 데이터를 프리필하여 등록 모달을 연다
 * - isEditMode = false → submit 시 새 레코드 생성
 * - 날짜를 다음 주로 자동 설정
 */

import { getSupabaseClientSafe } from '@shared/api';
import { getCachedElementById, formatNumberWithCommas } from '@shared/lib';
import { setEditModeState, resetEditMode } from '../state/register-state';
import { setModalTitle, setSubmitButtonText, closeModal } from '../ui/modal-controller';
import { handleGoalSubmit } from './submit-handler';
import { resetModalState } from '../ui/form-resetter';
import { setupManagerSelectEvent } from '../events/manager-events';
import { setupDatePickerEvents } from '../events/datepicker-events';
import { setupClientDropdownEvents } from '../events/client-events';
import { getActionItemsByGoalId } from '../services/action-service';
import { updateCategoryDropdownVisual } from '../setup-global-goal-events';
import type { GoalRegisterContext } from '@shared/types';
import type { GoalWithRevenue } from '@shared/types';

/**
 * 원본 goal의 start_date 기준으로 다음 주 월요일의 YYYY-MM-DD를 반환
 */
function getNextWeekDateStr(startDate?: string): string {
  const base = startDate ? new Date(startDate) : new Date();
  // 다음 주 월요일 = 현재 주 월요일 + 7일
  const nextMonday = new Date(base);
  nextMonday.setDate(base.getDate() + 7);
  // 월요일로 맞추기
  const day = nextMonday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  nextMonday.setDate(nextMonday.getDate() + diff);

  const y = nextMonday.getFullYear();
  const m = String(nextMonday.getMonth() + 1).padStart(2, '0');
  const d = String(nextMonday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function openGoalCloneModal(
  goal: GoalWithRevenue & {
    manager_id?: number;
    start_date?: string;
    end_date?: string;
    goal_category?: string;
    start_revenue?: number | null;
    goal_revenue?: number;
    period_type?: string;
  },
  context: GoalRegisterContext
): Promise<void> {
  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    console.error('[openGoalCloneModal] Supabase 클라이언트 없음');
    return;
  }

  // 상세 모달 닫기
  if (context.closeGoalDetailModal) {
    context.closeGoalDetailModal();
  }

  // 폼 초기화
  resetModalState(context);

  // 신규 등록 모드 (복제이므로 edit 모드 아님)
  setEditModeState(false, null, null);
  resetEditMode();

  const modal = getCachedElementById('goal-register-modal');
  if (!modal) return;

  // 제목과 버튼 텍스트
  setModalTitle('CLONE OBJECTIVE');
  setSubmitButtonText('등록하기');

  // --- 매니저 프리필 ---
  let managerId: number | undefined = goal.manager_id;
  if (!managerId) {
    const { data: goalData } = await supabase
      .from('ads_data_goal')
      .select('manager_id')
      .eq('id', goal.id)
      .single();
    if (goalData) {
      managerId = (goalData as { manager_id: number }).manager_id;
    }
  }

  const managerSelect = document.getElementById(
    'goal-manager-select'
  ) as HTMLSelectElement | null;
  if (managerSelect) {
    if (context.loadGoalManagerOptions) {
      await context.loadGoalManagerOptions();
    }
    setupManagerSelectEvent(context);

    const managerSelectUpdated = document.getElementById(
      'goal-manager-select'
    ) as HTMLSelectElement | null;
    if (managerSelectUpdated && managerId) {
      managerSelectUpdated.value = String(managerId);
      // 매니저는 잠금 상태 (원본과 동일한 매니저로 복제)
      managerSelectUpdated.disabled = true;
      managerSelectUpdated.style.background = '#f5f5f5';
      managerSelectUpdated.style.color = '#666';
    }

    if (context.loadClientList && managerId != null) {
      await context.loadClientList(managerId);
    }
  }

  // --- 날짜: 다음 주로 설정 ---
  const nextWeekDate = getNextWeekDateStr(goal.start_date);
  const dateInput = document.getElementById('goal-date-input');
  const datePickerIcon = document.getElementById('open-date-picker-btn');
  if (dateInput) {
    (dateInput as HTMLInputElement).value = nextWeekDate;
    (dateInput as HTMLInputElement).disabled = false;
    dateInput.style.background = '';
    dateInput.style.color = '';
  }
  if (datePickerIcon) {
    datePickerIcon.style.opacity = '';
    datePickerIcon.style.cursor = '';
    datePickerIcon.style.pointerEvents = '';
  }
  if (context.datePickerState) {
    context.datePickerState.selectedDate = new Date(nextWeekDate);
  }

  setupDatePickerEvents(context);

  // --- 카테고리 프리필 ---
  const categoryValue = goal.goal_category ?? 'upsales_big';
  const categoryInput = document.getElementById('goal-category-select') as HTMLInputElement | null;
  if (categoryInput) {
    categoryInput.value = categoryValue;
  }
  updateCategoryDropdownVisual(categoryValue);

  // --- 메모(Objective) 프리필 ---
  const memoInput = document.getElementById('goal-memo-input');
  if (memoInput) {
    (memoInput as HTMLInputElement).value = goal.memo ?? '';
  }

  // --- 기존 매출(start_revenue)은 비워둠 (선택된 광고주 기반으로 자동 계산됨) ---
  const startRevenueInput = document.getElementById('start-revenue-input');
  if (startRevenueInput) {
    (startRevenueInput as HTMLInputElement).value = '';
    (startRevenueInput as HTMLInputElement).disabled = false;
    startRevenueInput.style.background = '';
    startRevenueInput.style.color = '';
  }

  // --- 목표 매출 프리필 ---
  const goalRevenueInput = document.getElementById('goal-revenue-input');
  if (goalRevenueInput && goal.goal_revenue != null) {
    (goalRevenueInput as HTMLInputElement).value = formatNumberWithCommas(
      goal.goal_revenue
    );
  }

  // --- 타겟 광고주 프리필 ---
  const { data: targetClients, error: clientError } = await supabase
    .from('ads_data_goal_targetclient')
    .select('client_id')
    .eq('goal_id', goal.id);

  if (!clientError && targetClients) {
    for (const tc of targetClients as { client_id: number }[]) {
      context.selectedClientIds.add(String(tc.client_id));
    }
    if (context.renderSelectedClients) context.renderSelectedClients();
    if (context.updateClientSelectCount) context.updateClientSelectCount();
    if (context.updateHiddenInput) context.updateHiddenInput();
  }

  setupClientDropdownEvents(context);

  // --- 액션 아이템 프리필 (기존 액션 아이템의 텍스트만 복사, 상태는 리셋) ---
  const existingActionItems = await getActionItemsByGoalId(goal.id);
  if (existingActionItems?.length > 0 && context.renderExistingActionItems) {
    // 상태를 모두 progress로 리셋하여 새 목표에서 다시 시작
    const resetItems = existingActionItems.map((item) => ({
      ...item,
      status: 'progress' as const,
      done_memo: null,
    }));
    context.renderExistingActionItems(resetItems);
  }

  // --- start_revenue 자동 계산 트리거 ---
  // 광고주가 프리필되었으므로, 새 날짜 기준으로 start_revenue를 재계산
  const ctxAny = context as unknown as Record<string, unknown>;
  const calculateStartRevenue = ctxAny.calculateStartRevenue as (() => Promise<void>) | undefined;
  if (calculateStartRevenue) {
    await calculateStartRevenue();
  }

  // --- 모달 열기 ---
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // --- submit 이벤트 등록 ---
  const goalForm = document.getElementById('goal-register-form');
  if (goalForm) {
    const formEl = goalForm as HTMLFormElement & {
      _submitHandler?: (e: SubmitEvent) => void;
    };
    if (formEl._submitHandler) {
      goalForm.removeEventListener('submit', formEl._submitHandler);
    }

    const submitHandler = async (event: Event): Promise<void> => {
      await handleGoalSubmit(event as SubmitEvent, context);
    };
    formEl._submitHandler = submitHandler;
    goalForm.addEventListener('submit', submitHandler);
  }

  // --- 닫기/취소 이벤트 ---
  const closeModalBtn = document.getElementById('close-goal-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-goal-modal-btn');

  const handleClose = (): void => {
    closeModal(context);
  };

  if (closeModalBtn) {
    closeModalBtn.onclick = null;
    closeModalBtn.addEventListener('click', handleClose);
  }
  if (cancelModalBtn) {
    cancelModalBtn.onclick = null;
    cancelModalBtn.addEventListener('click', handleClose);
  }

  modal.onclick = null;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.stopPropagation();
      handleClose();
    }
  });
}
