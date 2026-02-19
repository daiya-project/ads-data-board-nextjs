/**
 * 주간 리포트 — 테이블 DOM (헤더·본문·합계)
 */

import { cleanClientName } from '@shared/lib/utils/format';
import { addWeeklySortableHeader } from './sort';
import type { WeeklyReportRow } from '../types';

export function createWeeklySummaryRow(clients: WeeklyReportRow[], weeks: string[]): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'summary-row';
  const totals = new Map<number, number>();
  weeks.forEach((_, weekIndex) => totals.set(weekIndex, 0));
  clients.forEach((client) => {
    weeks.forEach((_, weekIndex) => {
      totals.set(weekIndex, (totals.get(weekIndex) ?? 0) + (client.weeklyAmounts.get(weekIndex) ?? 0));
    });
  });
  const mostRecentWeekAmount = totals.get(0) ?? 0;
  const secondWeekAmount = totals.get(1) ?? 0;
  let weekCompareRatio: string;
  let weekCompareValue: number;
  if (secondWeekAmount > 0) {
    weekCompareValue = (mostRecentWeekAmount / secondWeekAmount) * 100 - 100;
    weekCompareRatio = weekCompareValue.toFixed(1);
  } else if (mostRecentWeekAmount > 0) {
    weekCompareValue = Infinity;
    weekCompareRatio = '∞';
  } else {
    weekCompareValue = 0;
    weekCompareRatio = '0.0';
  }
  const amountsForAvg: number[] = [];
  for (let i = 1; i < weeks.length; i++) {
    const amount = totals.get(i) ?? 0;
    if (amount > 0) amountsForAvg.push(amount);
  }
  const avgAmount = amountsForAvg.length > 0 ? amountsForAvg.reduce((s, v) => s + v, 0) / amountsForAvg.length : 0;
  let avgRatio: string;
  let avgValue: number;
  if (avgAmount > 0) {
    avgValue = (mostRecentWeekAmount / avgAmount) * 100 - 100;
    avgRatio = avgValue.toFixed(1);
  } else if (mostRecentWeekAmount > 0) {
    avgValue = Infinity;
    avgRatio = '∞';
  } else {
    avgValue = 0;
    avgRatio = '0.0';
  }
  const appendTd = (text: string, align: string, style?: Partial<CSSStyleDeclaration>) => {
    const td = document.createElement('td');
    td.textContent = text;
    td.style.textAlign = align as 'left' | 'right' | 'center';
    if (style) Object.assign(td.style, style);
    row.appendChild(td);
  };
  appendTd('', 'center');
  appendTd('합계', 'center', { fontWeight: '600' });
  appendTd(`${avgRatio}%`, 'center');
  const tdAvg = row.lastElementChild as HTMLElement;
  if (typeof avgValue === 'number' && !isNaN(avgValue) && isFinite(avgValue)) {
    if (avgValue < 0) tdAvg.style.color = '#3b82f6';
    else if (avgValue > 0) tdAvg.style.color = '#ef4444';
  }
  appendTd(`${weekCompareRatio}%`, 'center');
  const tdWeek = row.lastElementChild as HTMLElement;
  if (typeof weekCompareValue === 'number' && !isNaN(weekCompareValue) && isFinite(weekCompareValue)) {
    if (weekCompareValue < 0) tdWeek.style.color = '#3b82f6';
    else if (weekCompareValue > 0) tdWeek.style.color = '#ef4444';
  }
  const totalChange = mostRecentWeekAmount - secondWeekAmount;
  appendTd(totalChange.toLocaleString('ko-KR'), 'right', { fontWeight: '600' });
  const tdChange = row.lastElementChild as HTMLElement;
  if (totalChange < 0) tdChange.style.color = '#3b82f6';
  else if (totalChange > 0) tdChange.style.color = '#ef4444';
  weeks.forEach((_, weekIndex) => {
    const td = document.createElement('td');
    td.textContent = (totals.get(weekIndex) ?? 0).toLocaleString('ko-KR');
    td.style.textAlign = 'right';
    td.style.fontWeight = '600';
    if (weekIndex === 0) td.style.backgroundColor = '#fef9e7';
    row.appendChild(td);
  });
  return row;
}

export function renderWeeklyHeader(
  headerRow: HTMLElement,
  weeks: string[],
  onFilterTable: () => void
): void {
  headerRow.innerHTML = '';
  const cols = [
    ['client_id', 'Client ID'],
    ['client_name', 'Client'],
    ['avgValue', '평균 비교'],
    ['weekCompareValue', '주간 비교'],
    ['changeAmount', '증감'],
  ] as const;
  for (const [col, text] of cols) {
    const th = document.createElement('th');
    addWeeklySortableHeader(th, col, text, onFilterTable);
    headerRow.appendChild(th);
  }
  weeks.forEach((_, index) => {
    const th = document.createElement('th');
    const displayText = index === 0 ? '전주' : `${index + 1}주 전`;
    addWeeklySortableHeader(th, String(index), displayText, onFilterTable);
    headerRow.appendChild(th);
  });
}

export function renderWeeklyBody(
  tbody: HTMLElement,
  clients: WeeklyReportRow[],
  weeks: string[]
): void {
  tbody.innerHTML = '';
  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${5 + weeks.length}" class="empty-state">주간 데이터가 없습니다</td></tr>`;
    return;
  }
  tbody.appendChild(createWeeklySummaryRow(clients, weeks));
  for (const client of clients) {
    const row = document.createElement('tr');
    const tdId = document.createElement('td');
    tdId.textContent = String(client.client_id);
    tdId.style.textAlign = 'center';
    row.appendChild(tdId);
    const tdName = document.createElement('td');
    tdName.textContent = cleanClientName(client.client_name);
    tdName.style.textAlign = 'center';
    tdName.style.maxWidth = '350px';
    tdName.style.overflow = 'hidden';
    tdName.style.textOverflow = 'ellipsis';
    tdName.style.whiteSpace = 'nowrap';
    row.appendChild(tdName);
    const tdAvg = document.createElement('td');
    tdAvg.textContent = `${client.avgRatio ?? ''}%`;
    tdAvg.style.textAlign = 'center';
    const avgVal = client.avgValue;
    if (typeof avgVal === 'number' && !isNaN(avgVal) && isFinite(avgVal)) {
      if (avgVal < 0) tdAvg.style.color = '#3b82f6';
      else if (avgVal > 0) tdAvg.style.color = '#ef4444';
    }
    row.appendChild(tdAvg);
    const tdWeekCompare = document.createElement('td');
    tdWeekCompare.textContent = `${client.weekCompareRatio ?? ''}%`;
    tdWeekCompare.style.textAlign = 'center';
    const weekVal = client.weekCompareValue;
    if (typeof weekVal === 'number' && !isNaN(weekVal) && isFinite(weekVal)) {
      if (weekVal < 0) tdWeekCompare.style.color = '#3b82f6';
      else if (weekVal > 0) tdWeekCompare.style.color = '#ef4444';
    }
    row.appendChild(tdWeekCompare);
    const tdChange = document.createElement('td');
    tdChange.textContent = (client.changeAmount ?? 0).toLocaleString('ko-KR');
    tdChange.style.textAlign = 'right';
    const change = client.changeAmount ?? 0;
    if (change < 0) tdChange.style.color = '#3b82f6';
    else if (change > 0) tdChange.style.color = '#ef4444';
    row.appendChild(tdChange);
    weeks.forEach((_, weekIndex) => {
      const td = document.createElement('td');
      const amount = client.weeklyAmounts.get(weekIndex) ?? 0;
      td.textContent = amount.toLocaleString('ko-KR');
      td.style.textAlign = 'right';
      if (weekIndex === 0) td.style.backgroundColor = '#fef9e7';
      if (weekIndex >= 0 && weekIndex < weeks.length - 1) {
        const prevAmount = client.weeklyAmounts.get(weekIndex + 1) ?? 0;
        if (prevAmount > 0) {
          if (amount > prevAmount) td.style.color = '#ef4444';
          else if (amount < prevAmount) td.style.color = '#3b82f6';
        }
      }
      row.appendChild(td);
    });
    tbody.appendChild(row);
  }
}
