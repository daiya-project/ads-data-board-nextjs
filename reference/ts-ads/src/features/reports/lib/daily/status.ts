/**
 * 일별 리포트 — Status 카드 (계산 + DOM 갱신)
 */

import { getCachedElementById } from '@shared/lib';
import type { DailyReportRow, DailyStatusData } from '../types';

export function calculateDailyStatus(
  clients: DailyReportRow[],
  dateRange: string[]
): DailyStatusData {
  const A = dateRange[0];
  const B = dateRange[1];
  const statusData: DailyStatusData = {
    active: { today: [], yesterday: [] },
    new: { clients: [], totalAmount: 0 },
    stopped: { clients: [], totalAmount: 0 },
    rising: { clients: [], totalAmount: 0 },
    falling: { clients: [], totalAmount: 0 },
  };
  for (const client of clients) {
    const amountA = client.amounts.get(A) ?? 0;
    const amountB = client.amounts.get(B) ?? 0;
    if (amountA > 0) statusData.active.today.push(client);
    if (amountB > 0) statusData.active.yesterday.push(client);
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

export function updateDailyStatusCards(statusData: DailyStatusData): void {
  const yesterdayCount = statusData.active.yesterday.length;
  const todayCount = statusData.active.today.length;
  const summaryActiveCount = getCachedElementById('summary-active-count');
  if (summaryActiveCount) summaryActiveCount.textContent = `${yesterdayCount} → ${todayCount}`;
  const summaryNewCount = getCachedElementById('summary-new-count');
  const summaryNewAmount = getCachedElementById('summary-new-amount');
  if (summaryNewCount) summaryNewCount.textContent = String(statusData.new.clients.length);
  if (summaryNewAmount) summaryNewAmount.textContent = statusData.new.totalAmount.toLocaleString('ko-KR');
  const summaryStoppedCount = getCachedElementById('summary-stopped-count');
  const summaryStoppedAmount = getCachedElementById('summary-stopped-amount');
  if (summaryStoppedCount) summaryStoppedCount.textContent = String(statusData.stopped.clients.length);
  if (summaryStoppedAmount) summaryStoppedAmount.textContent = statusData.stopped.totalAmount.toLocaleString('ko-KR');
  const summaryRisingCount = getCachedElementById('summary-rising-count');
  const summaryRisingAmount = getCachedElementById('summary-rising-amount');
  if (summaryRisingCount) summaryRisingCount.textContent = String(statusData.rising.clients.length);
  if (summaryRisingAmount) summaryRisingAmount.textContent = statusData.rising.totalAmount.toLocaleString('ko-KR');
  const summaryFallingCount = getCachedElementById('summary-falling-count');
  const summaryFallingAmount = getCachedElementById('summary-falling-amount');
  if (summaryFallingCount) summaryFallingCount.textContent = String(statusData.falling.clients.length);
  if (summaryFallingAmount) summaryFallingAmount.textContent = statusData.falling.totalAmount.toLocaleString('ko-KR');
}
