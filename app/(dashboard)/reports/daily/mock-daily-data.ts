/**
 * Mock data for daily report table (development / placeholder).
 * Replace with real fetch when API is connected.
 */

import { getRecentDateRange } from "@/lib/utils/date-utils";
import type { DailyReportRow } from "@/lib/features/reports/daily-types";

const MOCK_END_DATE = "2026-02-19";

function buildAmounts(
  dateRange: string[],
  values: number[]
): Map<string, number> {
  const m = new Map<string, number>();
  dateRange.forEach((date, i) => m.set(date, values[i] ?? 0));
  return m;
}

export function getMockDateRange(): string[] {
  return getRecentDateRange(MOCK_END_DATE, 14);
}

export function getMockHolidays(): Set<string> {
  return new Set([]);
}

export function getMockClients(dateRange: string[]): DailyReportRow[] {
  const [d0, d1] = dateRange;
  return [
    {
      client_id: "001",
      client_name: "Client A / Daily Trend",
      manager_id: 1,
      amounts: buildAmounts(dateRange, [
        1200000, 1100000, 0, 950000, 900000, 0, 0, 880000, 850000, 0, 0, 800000,
        780000, 0,
      ]),
      mostRecentAmount: 1200000,
      changeAmount: 100000,
      dayBeforeRatio: "9.1",
      dayBeforeValue: 9.1,
      avgRatio: "12.3",
      avgValue: 12.3,
    },
    {
      client_id: "002",
      client_name: "2. Client B",
      manager_id: 1,
      amounts: buildAmounts(dateRange, [
        800000, 850000, 0, 820000, 800000, 0, 0, 750000, 700000, 0, 0, 680000,
        650000, 0,
      ]),
      mostRecentAmount: 800000,
      changeAmount: -50000,
      dayBeforeRatio: "-5.9",
      dayBeforeValue: -5.9,
      avgRatio: "2.1",
      avgValue: 2.1,
    },
    {
      client_id: "003",
      client_name: "Client C",
      manager_id: 2,
      amounts: buildAmounts(dateRange, [
        0, 0, 300000, 320000, 0, 0, 280000, 0, 0, 250000, 240000, 0, 0, 200000,
      ]),
      mostRecentAmount: 0,
      changeAmount: 0,
      dayBeforeRatio: "0.0",
      dayBeforeValue: 0,
      avgRatio: "∞",
      avgValue: Infinity,
    },
  ];
}
