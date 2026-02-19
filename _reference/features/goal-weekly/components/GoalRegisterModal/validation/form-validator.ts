/**
 * 목표 등록 폼 검증
 */

export interface FormDataForValidation {
  managerId?: string;
  dateInput?: string;
  category?: string;
  goalRevenue?: string;
  memo?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export function validateRequiredFields(formData: FormDataForValidation): ValidationResult {
  const { managerId, dateInput, category, goalRevenue } = formData;

  if (!managerId || !dateInput || !category || !goalRevenue) {
    return {
      isValid: false,
      message: '필수 항목을 모두 입력해주세요.',
    };
  }

  return { isValid: true, message: '' };
}

export function validateObjective(memo: string | undefined): ValidationResult {
  if (!memo || !memo.trim()) {
    return {
      isValid: false,
      message: '오브젝티브를 입력해주세요.',
    };
  }

  return { isValid: true, message: '' };
}

export function validateActionItems(
  actionItemInputs: NodeListOf<Element> | HTMLInputElement[],
  isEditMode = false
): ValidationResult {
  let hasActionItem = false;

  actionItemInputs.forEach((input) => {
    const el = input as HTMLInputElement;
    if (el.value?.trim()) {
      hasActionItem = true;
    }
  });

  if (!hasActionItem) {
    return {
      isValid: false,
      message: '액션 아이템을 입력해주세요.',
    };
  }

  return { isValid: true, message: '' };
}

export function validateForm(
  formData: FormDataForValidation & { memo?: string },
  _actionItemInputs: NodeListOf<Element> | HTMLInputElement[],
  _isEditMode = false
): ValidationResult {
  const requiredCheck = validateRequiredFields(formData);
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  const objectiveCheck = validateObjective(formData.memo);
  if (!objectiveCheck.isValid) {
    return objectiveCheck;
  }

  // 액션 아이템은 선택 입력 (필수 아님)

  return { isValid: true, message: '' };
}
