/**
 * DatePicker Component — Clean Rewrite
 * 날짜 선택 달력 (동적 DOM 생성, 자체 이벤트 관리)
 */

import { formatNumberWithCommas, removeCommas } from '@shared/lib';
import type { DatePickerState, LastPercentage } from './types';

let overlayEl: HTMLElement | null = null;

/**
 * 달력 패널 DOM 생성
 */
function createPanelDOM(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'date-picker-overlay';
  overlay.innerHTML = `
    <div class="date-picker-panel">
      <div class="date-picker-panel__header">
        <button type="button" class="date-picker-panel__nav" data-action="prev">
          <i class="ri-arrow-left-s-line"></i>
        </button>
        <h4 class="date-picker-panel__title"></h4>
        <button type="button" class="date-picker-panel__nav" data-action="next">
          <i class="ri-arrow-right-s-line"></i>
        </button>
      </div>
      <div class="date-picker-panel__grid"></div>
      <div class="date-picker-panel__footer">
        <button type="button" class="date-picker-panel__btn date-picker-panel__btn--cancel">취소</button>
        <button type="button" class="date-picker-panel__btn date-picker-panel__btn--today">오늘</button>
      </div>
    </div>
  `;
  return overlay;
}

/**
 * 달력 그리드 렌더링
 */
function renderGrid(
  gridEl: HTMLElement,
  state: DatePickerState,
  onDayClick: (date: Date) => void
): void {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay(); // 0=일 ~ 6=토

  let html = '';

  // 요일 헤더
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  for (const wd of weekdays) {
    html += `<div class="date-picker-panel__weekday">${wd}</div>`;
  }

  // 이전 월 빈칸
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    html += `<div class="date-picker-panel__day date-picker-panel__day--other">${prevMonthLastDay - i}</div>`;
  }

  // 현재 월 날짜
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = state.selectedDate
      ? date.toDateString() === state.selectedDate.toDateString()
      : false;

    let cls = 'date-picker-panel__day';
    if (isSelected) cls += ' date-picker-panel__day--selected';
    else if (isToday) cls += ' date-picker-panel__day--today';

    html += `<div class="${cls}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}</div>`;
  }

  // 다음 월 빈칸
  const totalCells = firstDayOfWeek + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const remaining = rows * 7 - totalCells;
  for (let day = 1; day <= remaining; day++) {
    html += `<div class="date-picker-panel__day date-picker-panel__day--other">${day}</div>`;
  }

  gridEl.innerHTML = html;

  // 날짜 클릭 이벤트 (이벤트 위임)
  gridEl.onclick = (e) => {
    const target = (e.target as HTMLElement).closest('.date-picker-panel__day:not(.date-picker-panel__day--other)') as HTMLElement | null;
    if (!target?.dataset.date) return;
    const [y, m, d] = target.dataset.date.split('-').map(Number);
    onDayClick(new Date(y, m - 1, d));
  };
}

/**
 * 타이틀 업데이트
 */
function updateTitle(overlay: HTMLElement, state: DatePickerState): void {
  const titleEl = overlay.querySelector('.date-picker-panel__title');
  if (titleEl) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;
    titleEl.textContent = `${year}년 ${month}월`;
  }
}

/**
 * 날짜 선택 달력 열기
 */
export function openDatePicker(
  datePickerState: DatePickerState,
  renderDatePicker: () => void
): void {
  if (overlayEl) {
    closeDatePicker();
  }

  const today = new Date();
  datePickerState.currentDate = new Date(today);
  datePickerState.targetInputId = 'goal-date-input';

  renderDatePicker();
}

/**
 * 날짜 선택 달력 닫기
 */
export function closeDatePicker(): void {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

/**
 * 달력 렌더링 (패널 생성 + 그리드 렌더)
 */
export function renderDatePicker(
  datePickerState: DatePickerState,
  selectDate: (date: Date) => void
): void {
  // 기존 패널이 없으면 생성
  if (!overlayEl) {
    overlayEl = createPanelDOM();
    document.body.appendChild(overlayEl);

    // 오버레이 배경 클릭으로 닫기
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        closeDatePicker();
      }
    });

    // 이전/다음 월 버튼
    overlayEl.querySelectorAll('.date-picker-panel__nav').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const delta = action === 'prev' ? -1 : 1;
        changeDatePickerMonth(delta, datePickerState, () => {
          renderDatePicker(datePickerState, selectDate);
        });
      });
    });

    // 취소 버튼
    overlayEl.querySelector('.date-picker-panel__btn--cancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDatePicker();
    });

    // 오늘 버튼
    overlayEl.querySelector('.date-picker-panel__btn--today')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDate(new Date());
    });
  }

  // 타이틀 & 그리드 업데이트
  updateTitle(overlayEl, datePickerState);
  const gridEl = overlayEl.querySelector('.date-picker-panel__grid') as HTMLElement | null;
  if (gridEl) {
    renderGrid(gridEl, datePickerState, selectDate);
  }
}

/**
 * 날짜 선택
 */
export async function selectDate(
  date: Date,
  datePickerState: DatePickerState,
  selectedClientIds: Set<number>,
  calculateStartRevenue: () => Promise<void>,
  lastPercentage: LastPercentage,
  _closeDatePicker: () => void
): Promise<void> {
  datePickerState.selectedDate = date;

  const dateInput = document.getElementById('goal-date-input') as HTMLInputElement | null;
  if (dateInput) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;

    if (selectedClientIds.size > 0) {
      await calculateStartRevenue();
      if (lastPercentage.value !== null) {
        const startRevenueInput = document.getElementById('start-revenue-input') as HTMLInputElement | null;
        const goalRevenueInput = document.getElementById('goal-revenue-input') as HTMLInputElement | null;
        if (startRevenueInput && goalRevenueInput && startRevenueInput.value) {
          const startRevenue = parseInt(removeCommas(startRevenueInput.value), 10);
          if (!isNaN(startRevenue)) {
            const goalRevenue = Math.round(
              startRevenue + (startRevenue * lastPercentage.value) / 100
            );
            goalRevenueInput.value = formatNumberWithCommas(String(goalRevenue));
          }
        }
      }
    }
  }

  closeDatePicker();
}

/**
 * 달력 월 변경
 */
export function changeDatePickerMonth(
  delta: number,
  datePickerState: DatePickerState,
  renderDatePicker: () => void
): void {
  const newDate = new Date(datePickerState.currentDate);
  newDate.setMonth(newDate.getMonth() + delta);
  datePickerState.currentDate = newDate;
  renderDatePicker();
}

/**
 * 오늘 날짜 선택
 */
export function selectTodayDate(selectDate: (date: Date) => void): void {
  const today = new Date();
  selectDate(today);
}
