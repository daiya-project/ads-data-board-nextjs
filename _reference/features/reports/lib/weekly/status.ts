/**
 * 주간 리포트 — Status 카드
 */

import { getCachedElementById } from '@shared/lib';
import type { WeeklyReportRow, WeeklyStatusData } from '../types';

export function calculateWeeklyStatus(clients: WeeklyReportRow[], weeks: string[]): WeeklyStatusData {
  const weekIndexA = 0;
  const weekIndexB = 1;
  const statusData: WeeklyStatusData = {
    active: { currentWeek: [], previousWeek: [] },
    new: { clients: [], totalAmount: 0 },
    stopped: { clients: [], totalAmount: 0 },
    rising: { clients: [], totalAmount: 0 },
    falling: { clients: [], totalAmount: 0 },
  };
  for (const client of clients) {
    const amountA = client.weeklyAmounts.get(weekIndexA) ?? 0;
    const amountB = client.weeklyAmounts.get(weekIndexB) ?? 0;
    if (amountA > 0) statusData.active.currentWeek.push(client);
    if (amountB > 0) statusData.active.previousWeek.push(client);
    if (amountB === 0 && amountA > 0) {
      statusData.new.clients.push(client);
      statusData.new.totalAmount += amountA;
    } else if (amountB > 0 && amountA === 0) {
      statusData.stopped.clients.push(client);
      statusData.stopped.totalAmount += amountB;
    } else if (amountA > 0 && amountB > 0 && amountA - amountB > 0) {
      statusData.rising.clients.push(client);
      statusData.rising.totalAmount += amountA - amountB;
    } else if (amountA > 0 && amountB > 0 && amountA - amountB < 0) {
      statusData.falling.clients.push(client);
      statusData.falling.totalAmount += amountB - amountA;
    }
  }
  return statusData;
}

export function updateWeeklyStatusCards(statusData: WeeklyStatusData): void {
  const previousWeekCount = statusData.active.previousWeek.length;
  const currentWeekCount = statusData.active.currentWeek.length;
  const el = getCachedElementById('weekly-summary-active-count');
  if (el) el.textContent = `${previousWeekCount} → ${currentWeekCount}`;
  const newCount = getCachedElementById('weekly-summary-new-count');
  const newAmount = getCachedElementById('weekly-summary-new-amount');
  if (newCount) newCount.textContent = String(statusData.new.clients.length);
  if (newAmount) newAmount.textContent = statusData.new.totalAmount.toLocaleString('ko-KR');
  const stoppedCount = getCachedElementById('weekly-summary-stopped-count');
  const stoppedAmount = getCachedElementById('weekly-summary-stopped-amount');
  if (stoppedCount) stoppedCount.textContent = String(statusData.stopped.clients.length);
  if (stoppedAmount) stoppedAmount.textContent = statusData.stopped.totalAmount.toLocaleString('ko-KR');
  const risingCount = getCachedElementById('weekly-summary-rising-count');
  const risingAmount = getCachedElementById('weekly-summary-rising-amount');
  if (risingCount) risingCount.textContent = String(statusData.rising.clients.length);
  if (risingAmount) risingAmount.textContent = statusData.rising.totalAmount.toLocaleString('ko-KR');
  const fallingCount = getCachedElementById('weekly-summary-falling-count');
  const fallingAmount = getCachedElementById('weekly-summary-falling-amount');
  if (fallingCount) fallingCount.textContent = String(statusData.falling.clients.length);
  if (fallingAmount) fallingAmount.textContent = statusData.falling.totalAmount.toLocaleString('ko-KR');
}
