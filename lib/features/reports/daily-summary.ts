/**
 * Daily report — summary row (합계) calculation.
 * Pure functions for table rendering; no DOM.
 */

import type { DailyReportRow } from "./daily-types";

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export interface DailySummaryRow {
  /** Per-date totals */
  totals: Map<string, number>;
  avgRatio: string;
  avgValue: number;
  dayBeforeRatio: string;
  dayBeforeValue: number;
  changeAmount: number;
}

export function buildDailySummary(
  clients: DailyReportRow[],
  dateRange: string[]
): DailySummaryRow {
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
  const changeAmount = mostRecentAmount - dayBeforeAmount;

  let dayBeforeRatio: string;
  let dayBeforeValue: number;
  if (dayBeforeAmount > 0) {
    dayBeforeValue = (mostRecentAmount / dayBeforeAmount) * 100 - 100;
    dayBeforeRatio = dayBeforeValue.toFixed(1);
  } else if (mostRecentAmount > 0) {
    dayBeforeValue = Infinity;
    dayBeforeRatio = "∞";
  } else {
    dayBeforeValue = 0;
    dayBeforeRatio = "0.0";
  }

  const amountsForAvg: number[] = [];
  for (let i = 1; i < dateRange.length; i++) {
    const date = dateRange[i];
    if (!isWeekend(date)) {
      const amount = totals.get(date) ?? 0;
      if (amount > 0) amountsForAvg.push(amount);
    }
  }
  const avgAmount =
    amountsForAvg.length > 0
      ? amountsForAvg.reduce((s, v) => s + v, 0) / amountsForAvg.length
      : 0;
  let avgRatio: string;
  let avgValue: number;
  if (avgAmount > 0) {
    avgValue = (mostRecentAmount / avgAmount) * 100 - 100;
    avgRatio = avgValue.toFixed(1);
  } else if (mostRecentAmount > 0) {
    avgValue = Infinity;
    avgRatio = "∞";
  } else {
    avgValue = 0;
    avgRatio = "0.0";
  }

  return {
    totals,
    avgRatio,
    avgValue,
    dayBeforeRatio,
    dayBeforeValue,
    changeAmount,
  };
}
