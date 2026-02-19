/**
 * Goal Monthly — 캘린더 DOM 렌더링
 * 달력형 7열 그리드 + 프로그래스 바
 */

import { formatNumberWithCommas } from '@shared/lib';
import type { CalendarData, CalendarWeekRow, DayCell, WeekGoalSummary } from '../../lib/types';

/* ================================================================
   진입점
   ================================================================ */

export function renderCalendar(
  containerId: string,
  data: CalendarData,
  selectedMonth: string,
  onMonthChange: (delta: number) => void
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'Calendar__root';

  // 월 표시 + 네비게이션 헤더
  el.appendChild(createMonthHeader(selectedMonth, onMonthChange));

  // 요일 헤더 (최상단 한 번만)
  el.appendChild(createWeekdayHeader());

  // 주차별 블록
  for (const week of data.weeks) {
    el.appendChild(createWeekBlock(week, data.weekdayAvg));
  }

  container.appendChild(el);
}

/* ================================================================
   월 표시 + 네비게이션 헤더
   ================================================================ */

function createMonthHeader(selectedMonth: string, onMonthChange: (delta: number) => void): HTMLElement {
  const [y, m] = selectedMonth.split('-').map(Number);

  const header = document.createElement('div');
  header.className = 'Calendar__monthHeader';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'Calendar__monthNav';
  prevBtn.type = 'button';
  prevBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
  prevBtn.addEventListener('click', () => onMonthChange(-1));

  const title = document.createElement('span');
  title.className = 'Calendar__monthTitle';
  title.textContent = `${y}년 ${String(m).padStart(2, '0')}월`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'Calendar__monthNav';
  nextBtn.type = 'button';
  nextBtn.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
  nextBtn.addEventListener('click', () => onMonthChange(1));

  header.appendChild(prevBtn);
  header.appendChild(title);
  header.appendChild(nextBtn);

  return header;
}

/* ================================================================
   요일 헤더
   ================================================================ */

function createWeekdayHeader(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'Calendar__headerRow';

  const names = ['월', '화', '수', '목', '금', '토', '일'];
  names.forEach((name, i) => {
    const span = document.createElement('span');
    span.className = 'Calendar__headerDay';
    if (i >= 5) span.classList.add('is-weekend');
    span.textContent = name;
    row.appendChild(span);
  });

  return row;
}

/* ================================================================
   주차 블록
   ================================================================ */

function createWeekBlock(week: CalendarWeekRow, weekdayAvg: number): HTMLElement {
  const block = document.createElement('div');
  block.className = 'Calendar__weekBlock';
  block.dataset.weekId = week.weekId;

  // 날짜 + 매출 그리드
  block.appendChild(createDayGrid(week.days, weekdayAvg));

  // 프로그래스 바
  if (week.goalSummary) {
    block.appendChild(createProgressBar(week.goalSummary));
  } else {
    block.appendChild(createNoGoalMessage());
  }

  return block;
}

/* ================================================================
   날짜 그리드
   ================================================================ */

/** 매출액 대비 평균 비율에 따른 텍스트 색상 클래스 */
function getAmountColorClass(amount: number, weekdayAvg: number): string {
  if (weekdayAvg <= 0) return '';
  const ratio = amount / weekdayAvg;
  if (ratio >= 1.3) return 'amt-very-high';   // 진한 빨강
  if (ratio >= 1.0) return 'amt-high';         // 빨강
  if (ratio >= 0.7) return 'amt-low';          // 파랑
  return 'amt-very-low';                       // 진한 파랑
}

function createDayGrid(days: DayCell[], weekdayAvg: number): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'Calendar__dayGrid';

  for (const day of days) {
    const cell = document.createElement('div');
    cell.className = 'Calendar__dayCell';
    cell.dataset.date = day.date;

    // CSS 클래스 적용
    if (!day.isCurrentMonth) cell.classList.add('is-other-month');
    if (day.isWeekend) cell.classList.add('is-weekend');
    if (day.isHoliday) cell.classList.add('is-holiday');
    if (day.isLatestData) cell.classList.add('is-latest-data');
    if (day.isFuture) cell.classList.add('is-future');
    // no-data 클래스는 타월(전월/차월)에만 적용 — 당월은 회색 처리 안 함
    if (!day.hasData && !day.isFuture && !day.isCurrentMonth) cell.classList.add('no-data');

    // 날짜 숫자 (mm. dd. 형태)
    const dayNum = document.createElement('div');
    dayNum.className = 'Calendar__dayNumber';
    dayNum.textContent = day.dayLabel;
    cell.appendChild(dayNum);

    // 매출 금액
    const dayAmt = document.createElement('div');
    dayAmt.className = 'Calendar__dayAmount';
    if (day.isFuture) {
      dayAmt.textContent = '';
    } else if (!day.hasData) {
      dayAmt.textContent = day.isCurrentMonth ? '' : '—';
    } else {
      // x,xxx만원 형태
      dayAmt.textContent = formatNumberWithCommas(Math.round(day.amount / 10000)) + '만원';
      // 평균 대비 텍스트 색상 클래스 적용 (해당 월만)
      if (day.isCurrentMonth) {
        const colorClass = getAmountColorClass(day.amount, weekdayAvg);
        if (colorClass) dayAmt.classList.add(colorClass);
      }
    }
    cell.appendChild(dayAmt);

    grid.appendChild(cell);
  }

  return grid;
}

/* ================================================================
   프로그래스 바
   ================================================================ */

function getBarRateClass(rate: number): string {
  if (rate >= 100) return 'rate-over';    // 100% 이상 — 붉은색
  if (rate >= 85) return 'rate-high';     // 85~100% — 연한 붉은색
  if (rate >= 70) return 'rate-mid';      // 70~85% — 아주 연한 붉은색
  return 'rate-low';                      // 70% 미만 — 연한 파란색
}

/** 원 단위 포맷 (프로그래스 바 전용) */
function formatWon(value: number): string {
  return formatNumberWithCommas(Math.round(value));
}

function createProgressBar(summary: WeekGoalSummary): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'Calendar__progressBar';

  const track = document.createElement('div');
  track.className = 'Calendar__progressTrack';

  // 전주 비교 마커 (바 위 | 형태) — fill 보다 먼저 추가하여 z-index 관리
  if (summary.prevWeekAchieved !== null && summary.weekGoal > 0) {
    const prevRate = Math.min((summary.prevWeekAchieved / summary.weekGoal) * 100, 100);
    const marker = document.createElement('div');
    marker.className = 'Calendar__progressPrevMarker';
    marker.style.left = `${prevRate}%`;
    marker.dataset.label = '전주';
    track.appendChild(marker);
  }

  // 채워진 바
  const fill = document.createElement('div');
  const fillWidth = Math.min(summary.rate, 100);
  fill.className = `Calendar__progressFill ${getBarRateClass(summary.rate)}`;
  fill.style.width = `${fillWidth}%`;
  track.appendChild(fill);

  // 내부 텍스트
  const text = document.createElement('div');
  text.className = 'Calendar__progressText';
  const rateClass = getBarRateClass(summary.rate);
  text.innerHTML = `Goal: <strong>${formatWon(summary.weekGoal)}</strong> · Achieve: <strong>${formatWon(summary.weekAchieved)}</strong> <span class="Calendar__progressRate ${rateClass}">${summary.rate.toFixed(1)}%</span>`;
  track.appendChild(text);

  wrapper.appendChild(track);
  return wrapper;
}

function createNoGoalMessage(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'Calendar__progressNoGoal';
  el.textContent = '등록된 목표 없음';
  return el;
}
