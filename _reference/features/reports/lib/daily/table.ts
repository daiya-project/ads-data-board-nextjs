/**
 * 일별 리포트 — 테이블 DOM (헤더·본문·합계)
 */

import { cleanClientName } from '@shared/lib/utils/format';
import { addDailySortableHeader } from './sort';
import type { DailyReportRow } from '../types';

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function createDailySummaryRow(
  clients: DailyReportRow[],
  dateRange: string[]
): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'summary-row';
  const totals = new Map<string, number>();
  dateRange.forEach((date) => totals.set(date, 0));
  clients.forEach((client) => {
    dateRange.forEach((date) => {
      totals.set(date, (totals.get(date) ?? 0) + (client.amounts.get(date) ?? 0));
    });
  });
  const mostRecentDate = dateRange[0];
  const mostRecentAmount = totals.get(mostRecentDate) ?? 0;
  const dayBeforeDate = dateRange[1];
  const dayBeforeAmount = totals.get(dayBeforeDate) ?? 0;
  let dayBeforeRatio: string;
  let dayBeforeValue: number;
  if (dayBeforeAmount > 0) {
    dayBeforeValue = (mostRecentAmount / dayBeforeAmount) * 100 - 100;
    dayBeforeRatio = dayBeforeValue.toFixed(1);
  } else if (mostRecentAmount > 0) {
    dayBeforeValue = Infinity;
    dayBeforeRatio = '∞';
  } else {
    dayBeforeValue = 0;
    dayBeforeRatio = '0.0';
  }
  const amountsForAvg: number[] = [];
  for (let i = 1; i < dateRange.length; i++) {
    const date = dateRange[i];
    if (!isWeekend(date)) {
      const amount = totals.get(date) ?? 0;
      if (amount > 0) amountsForAvg.push(amount);
    }
  }
  const avgAmount = amountsForAvg.length > 0 ? amountsForAvg.reduce((s, v) => s + v, 0) / amountsForAvg.length : 0;
  let avgRatio: string;
  let avgValue: number;
  if (avgAmount > 0) {
    avgValue = (mostRecentAmount / avgAmount) * 100 - 100;
    avgRatio = avgValue.toFixed(1);
  } else if (mostRecentAmount > 0) {
    avgValue = Infinity;
    avgRatio = '∞';
  } else {
    avgValue = 0;
    avgRatio = '0.0';
  }
  const tdId = document.createElement('td');
  tdId.textContent = '';
  tdId.style.textAlign = 'center';
  row.appendChild(tdId);
  const tdName = document.createElement('td');
  tdName.textContent = '합계';
  tdName.style.textAlign = 'center';
  tdName.style.fontWeight = '600';
  row.appendChild(tdName);
  const tdAvg = document.createElement('td');
  tdAvg.textContent = `${avgRatio}%`;
  tdAvg.style.textAlign = 'center';
  if (typeof avgValue === 'number' && !isNaN(avgValue) && isFinite(avgValue)) {
    if (avgValue < 0) tdAvg.style.color = '#3b82f6';
    else if (avgValue > 0) tdAvg.style.color = '#ef4444';
  }
  row.appendChild(tdAvg);
  const tdDayBefore = document.createElement('td');
  tdDayBefore.textContent = `${dayBeforeRatio}%`;
  tdDayBefore.style.textAlign = 'center';
  if (typeof dayBeforeValue === 'number' && !isNaN(dayBeforeValue) && isFinite(dayBeforeValue)) {
    if (dayBeforeValue < 0) tdDayBefore.style.color = '#3b82f6';
    else if (dayBeforeValue > 0) tdDayBefore.style.color = '#ef4444';
  }
  row.appendChild(tdDayBefore);
  const totalChangeAmount = mostRecentAmount - dayBeforeAmount;
  const tdChange = document.createElement('td');
  tdChange.textContent = totalChangeAmount.toLocaleString('ko-KR');
  tdChange.style.textAlign = 'right';
  tdChange.style.fontWeight = '600';
  if (totalChangeAmount < 0) tdChange.style.color = '#3b82f6';
  else if (totalChangeAmount > 0) tdChange.style.color = '#ef4444';
  row.appendChild(tdChange);
  dateRange.forEach((date, dateIndex) => {
    const td = document.createElement('td');
    td.textContent = (totals.get(date) ?? 0).toLocaleString('ko-KR');
    td.style.textAlign = 'right';
    td.style.fontWeight = '600';
    if (dateIndex === 0) td.style.backgroundColor = '#fef9e7';
    row.appendChild(td);
  });
  return row;
}

export function renderDailyHeader(
  headerRow: HTMLElement,
  dateRange: string[],
  holidays: Set<string>,
  onFilterTable: () => void
): void {
  headerRow.innerHTML = '';
  const thId = document.createElement('th');
  addDailySortableHeader(thId, 'client_id', 'Client ID', onFilterTable);
  headerRow.appendChild(thId);
  const thName = document.createElement('th');
  addDailySortableHeader(thName, 'client_name', 'Client', onFilterTable);
  headerRow.appendChild(thName);
  const thAvg = document.createElement('th');
  addDailySortableHeader(thAvg, 'avgValue', '평균 비교', onFilterTable);
  headerRow.appendChild(thAvg);
  const thDayBefore = document.createElement('th');
  addDailySortableHeader(thDayBefore, 'dayBeforeValue', '전일 비교', onFilterTable);
  headerRow.appendChild(thDayBefore);
  const thChange = document.createElement('th');
  addDailySortableHeader(thChange, 'changeAmount', '증감', onFilterTable);
  headerRow.appendChild(thChange);
  dateRange.forEach((date) => {
    const th = document.createElement('th');
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    addDailySortableHeader(th, date, `${month}. ${day}.`, onFilterTable);
    th.title = date;
    if (holidays.has(date)) {
      th.style.color = '#ef4444';
      th.style.fontWeight = 'bold';
    }
    headerRow.appendChild(th);
  });
}

export function renderDailyBody(
  tbody: HTMLElement,
  clients: DailyReportRow[],
  dateRange: string[],
  holidays: Set<string>
): void {
  tbody.innerHTML = '';
  tbody.appendChild(createDailySummaryRow(clients, dateRange));
  for (const client of clients) {
    const row = document.createElement('tr');
    const tdId = document.createElement('td');
    tdId.textContent = String(client.client_id);
    tdId.style.textAlign = 'center';
    row.appendChild(tdId);
    const tdName = document.createElement('td');
    tdName.textContent = cleanClientName(client.client_name);
    tdName.style.textAlign = 'center';
    tdName.style.maxWidth = '250px';
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
    const tdDayBefore = document.createElement('td');
    tdDayBefore.textContent = `${client.dayBeforeRatio ?? ''}%`;
    tdDayBefore.style.textAlign = 'center';
    const dayVal = client.dayBeforeValue;
    if (typeof dayVal === 'number' && !isNaN(dayVal) && isFinite(dayVal)) {
      if (dayVal < 0) tdDayBefore.style.color = '#3b82f6';
      else if (dayVal > 0) tdDayBefore.style.color = '#ef4444';
    }
    row.appendChild(tdDayBefore);
    const tdChange = document.createElement('td');
    tdChange.textContent = (client.changeAmount ?? 0).toLocaleString('ko-KR');
    tdChange.style.textAlign = 'right';
    const change = client.changeAmount ?? 0;
    if (change < 0) tdChange.style.color = '#3b82f6';
    else if (change > 0) tdChange.style.color = '#ef4444';
    row.appendChild(tdChange);
    dateRange.forEach((date, dateIndex) => {
      const td = document.createElement('td');
      const amount = client.amounts.get(date) ?? 0;
      td.textContent = amount.toLocaleString('ko-KR');
      td.style.textAlign = 'right';
      if (dateIndex === 0) td.style.backgroundColor = '#fef9e7';
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const weekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (!weekend && dateIndex >= 0) {
        let previousDate: string;
        if (dateIndex === 0) previousDate = dateRange[1];
        else if (dayOfWeek === 1) {
          const prev = new Date(dateObj);
          prev.setDate(prev.getDate() - 3);
          previousDate = prev.toISOString().split('T')[0];
        } else previousDate = dateRange[dateIndex - 1];
        const previousAmount = client.amounts.get(previousDate) ?? 0;
        if (previousAmount > 0) {
          if (amount > previousAmount) td.style.color = '#ef4444';
          else if (amount < previousAmount) td.style.color = '#3b82f6';
        }
      }
      if (holidays.has(date)) td.style.color = '#94a3b8';
      row.appendChild(td);
    });
    tbody.appendChild(row);
  }
}
