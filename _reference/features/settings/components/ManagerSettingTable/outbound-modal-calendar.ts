/**
 * Outbound Setting Modal - 달력 HTML 생성
 */

export function buildCalendarHTML(
  calendarYear: number,
  calendarMonth: number,
  currentStartDate: string | null,
  currentEndDate: string | null
): string {
  const monthLabel = `${calendarYear}년 ${String(calendarMonth).padStart(2, '0')}월`;
  const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  let rows = '';
  let day = 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    if (i % 7 === 0) rows += '<tr>';

    if (i < startOffset || day > daysInMonth) {
      rows += '<td></td>';
    } else {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let cellClass = 'outbound-cal-day';

      if (currentStartDate === dateStr) cellClass += ' outbound-cal-day--start';
      if (currentEndDate === dateStr) cellClass += ' outbound-cal-day--end';
      if (
        currentStartDate && currentEndDate &&
        dateStr > currentStartDate && dateStr < currentEndDate
      ) {
        cellClass += ' outbound-cal-day--range';
      }

      const dayOfWeek = i % 7;
      if (dayOfWeek === 5) cellClass += ' outbound-cal-day--sat';
      if (dayOfWeek === 6) cellClass += ' outbound-cal-day--sun';

      rows += `<td><span class="${cellClass}" data-date="${dateStr}">${day}</span></td>`;
      day++;
    }

    if (i % 7 === 6) rows += '</tr>';
  }

  return `
    <div class="outbound-cal-nav">
      <button type="button" class="outbound-cal-nav-btn" data-action="prev-month">&lt;</button>
      <span class="outbound-cal-month-label">${monthLabel}</span>
      <button type="button" class="outbound-cal-nav-btn" data-action="next-month">&gt;</button>
    </div>
    <table class="outbound-cal-table">
      <thead>
        <tr><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
