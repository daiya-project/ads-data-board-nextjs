/**
 * Goal Setting - Cell Edit Module
 * 셀 편집 로직 (Goal Setting 페이지)
 */

import { formatNumberWithCommas, formatDate, handleError } from '@shared/lib';
import { getSupabaseClientSafe } from '@shared/api';

/**
 * 셀 편집 모드 활성화
 */
export function enableCellEdit(
  cell: HTMLElement,
  saveCellEditDirect: (cell: HTMLElement) => void,
  cancelCellEditDirect: (cell: HTMLElement) => void
): void {
  if (cell.classList.contains('readonly-cell')) return;
  if (cell.classList.contains('editing')) return;

  const currentValue = cell.textContent?.trim().replace(/,/g, '') ?? '';
  cell.dataset.originalValue = currentValue;
  cell.classList.add('editing');
  cell.contentEditable = 'true';
  cell.style.backgroundColor = '#ffffff';
  cell.style.cursor = 'text';
  cell.textContent = currentValue;

  setTimeout(() => {
    cell.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, 0);

  const handleInput = (): void => {
    const numericValue = cell.textContent?.replace(/[^\d]/g, '') ?? '';
    if (numericValue) {
      cell.textContent = formatNumberWithCommas(parseInt(numericValue, 10));
      setTimeout(() => {
        const textNode = cell.firstChild;
        if (textNode) {
          const newRange = document.createRange();
          newRange.selectNodeContents(textNode);
          newRange.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        }
      }, 0);
    } else {
      cell.textContent = '';
    }
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      saveCellEditDirect(cell);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      cancelCellEditDirect(cell);
    }
  };

  const handleBlur = (): void => {
    cleanup();
    cancelCellEditDirect(cell);
  };

  const cleanup = (): void => {
    cell.removeEventListener('input', handleInput);
    cell.removeEventListener('keydown', handleKeydown as EventListener);
    cell.removeEventListener('blur', handleBlur);
  };

  cell.addEventListener('input', handleInput);
  cell.addEventListener('keydown', handleKeydown as EventListener);
  cell.addEventListener('blur', handleBlur);
}

/**
 * 셀 편집 저장 (직접 편집 모드)
 */
export async function saveCellEditDirect(
  cell: HTMLElement,
  updateTotalAndGap: (row: Element) => void
): Promise<void> {
  const managerId = parseInt(cell.dataset.managerId ?? '', 10);
  const monthKey = cell.dataset.monthKey ?? '';
  const originalValue = cell.dataset.originalValue ?? '';
  const value = cell.textContent?.trim().replace(/,/g, '') ?? '';
  const numericValue = value === '' ? 0 : parseInt(value, 10);

  cell.classList.remove('editing');
  cell.contentEditable = 'false';
  cell.style.backgroundColor = '';
  cell.style.cursor = '';
  delete cell.dataset.originalValue;

  if (Number.isNaN(numericValue) || numericValue < 0) {
    cell.textContent = originalValue ? formatNumberWithCommas(parseInt(originalValue, 10)) : '';
    cell.style.textAlign = 'right';
    return;
  }

  cell.textContent = numericValue > 0 ? formatNumberWithCommas(numericValue) : '';
  cell.style.textAlign = 'right';

  const [year, month] = monthKey.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, lastDay);
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  const supabase = getSupabaseClientSafe();
  if (!supabase) {
    handleError(new Error('Supabase 클라이언트가 초기화되지 않았습니다.'), 'saveCellEditDirect');
    return;
  }

  try {
    const { data: existingGoals, error: checkError } = await supabase
      .from('ads_data_goal')
      .select('id')
      .eq('manager_id', managerId)
      .eq('period_type', 'monthly')
      .eq('start_date', startDateStr)
      .eq('end_date', endDateStr);

    if (checkError) throw checkError;

    const existing = (existingGoals as { id: number }[] | null) ?? [];
    if (existing.length > 0) {
      const { error: updateError } = await supabase
        .from('ads_data_goal')
        .update({ goal_revenue: numericValue })
        .eq('id', existing[0].id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from('ads_data_goal').insert({
        manager_id: managerId,
        period_type: 'monthly',
        start_date: startDateStr,
        end_date: endDateStr,
        goal_category: null,
        memo: `${year}년 ${month}월 목표`,
        goal_revenue: numericValue,
        start_revenue: 0,
        activate: true,
      } as Record<string, unknown>);
      if (insertError) throw insertError;
    }

    const row = cell.closest('tr');
    if (row) updateTotalAndGap(row);
  } catch (err) {
    console.error('셀 저장 오류:', err);
    alert('데이터 저장 중 오류가 발생했습니다: ' + ((err as Error).message ?? '알 수 없는 오류'));
    cell.textContent = originalValue ? formatNumberWithCommas(parseInt(originalValue, 10)) : '';
    cell.style.textAlign = 'right';
  }
}

/**
 * 셀 편집 취소 (직접 편집 모드)
 */
export function cancelCellEditDirect(cell: HTMLElement): void {
  const originalValue = cell.dataset.originalValue ?? '';
  cell.classList.remove('editing');
  cell.contentEditable = 'false';
  cell.style.backgroundColor = '';
  cell.style.cursor = '';
  delete cell.dataset.originalValue;
  cell.textContent = originalValue ? formatNumberWithCommas(parseInt(originalValue, 10)) : '';
  cell.style.textAlign = 'right';
}

/**
 * Total과 Gap 업데이트
 */
export function updateTotalAndGap(row: Element): void {
  const teamCell = row.children[1] as HTMLElement;
  const teamValue = parseInt(teamCell?.textContent?.replace(/,/g, '') ?? '0', 10) || 0;

  const editableCells = row.querySelectorAll('.editable-cell');
  let total = 0;
  let filledCount = 0;

  editableCells.forEach((cell) => {
    const value = parseInt((cell as HTMLElement).textContent?.replace(/,/g, '') ?? '0', 10) || 0;
    total += value;
    if (value > 0) filledCount++;
  });

  const totalCell = row.querySelector('.total-cell') as HTMLElement | null;
  const gapCell = row.querySelector('.gap-cell') as HTMLElement | null;
  if (totalCell) totalCell.textContent = total > 0 ? formatNumberWithCommas(total) : '';

  const totalManagers = editableCells.length;
  if (gapCell) {
    if (filledCount === totalManagers && totalManagers > 0) {
      const gap = total - teamValue;
      gapCell.textContent = gap !== 0 ? formatNumberWithCommas(gap) : '';
    } else {
      gapCell.textContent = '';
    }
    gapCell.style.color = '#94a3b8';
  }
}
