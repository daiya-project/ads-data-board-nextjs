/**
 * 목표 등록/수정 제출 핸들러 (진입점)
 */

import { getSupabaseClientSafe } from '@shared/api';
import { handleError } from '@shared/lib';
import { getEditModeState } from '../state/register-state';
import {
  calculateWeeklyDates,
  calculateMonthlyDates,
} from '../utils/date-calculator';
import { validateForm } from '../validation/form-validator';
import { collectFormData } from './submit-handler-form';
import { handleUpdateMode, handleCreateMode } from './submit-handler-modes';
import type { GoalRegisterContext } from '@shared/types';

export async function handleGoalSubmit(
  event: Event,
  context: GoalRegisterContext
): Promise<void> {
  event.preventDefault();

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(
      new Error('Supabase 클라이언트가 초기화되지 않았습니다.'),
      'saveGoal',
      'Supabase 클라이언트가 초기화되지 않았습니다.'
    );
    return;
  }

  const editState = getEditModeState();
  const { isEditMode, editGoalId } = editState;

  const formData = collectFormData();
  const {
    managerId,
    periodType,
    dateInput,
    category,
    memo,
    startRevenue,
    goalRevenue,
    actionItemInputs,
  } = formData;

  const validation = validateForm(
    { managerId, dateInput, category, goalRevenue, memo },
    actionItemInputs,
    isEditMode
  );

  if (!validation.isValid) {
    alert(validation.message);
    return;
  }

  try {
    const inputDate = new Date(dateInput);
    const dates =
      periodType === 'weekly'
        ? calculateWeeklyDates(inputDate)
        : calculateMonthlyDates(inputDate);

    if (isEditMode && editGoalId) {
      await handleUpdateMode({
        supabase,
        editGoalId,
        category,
        memo,
        goalRevenue,
        context,
        dates,
        periodType,
      });
    } else {
      await handleCreateMode({
        supabase,
        managerId,
        periodType,
        dates,
        category,
        memo,
        startRevenue,
        goalRevenue,
        context,
      });
    }
  } catch (error) {
    console.error('성과 등록/수정 오류:', error);
    alert(
      '성과 등록/수정 중 오류가 발생했습니다: ' +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
